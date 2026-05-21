/**
 * ⚙️ QR 로그인 자동 완화 플래그 관리
 * 
 * Critical 알림 발생 시 임시 플래그를 자동으로 켜서 완화하고,
 * TTL 만료 시 자동으로 원복하는 시스템
 * 
 * 안전장치:
 * - Critical 레벨에서만 작동
 * - TTL 필수 (기본 30분)
 * - 자동 원복 보장
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { createExperiment } from "./qrLoginExperimentAnalysis";

const db = getFirestore();

/**
 * Feature Flag 문서 구조
 */
export interface QRLoginMitigationFlags {
  smsUXVariant: "v1" | "v2" | null;
  extendedExpireSec: number | null; // 초 단위 (예: 60 = +1분)
  mobileUXBoost: boolean;
  enabledAt: Timestamp | null;
  expiresAt: Timestamp | null;
  reason: string | null; // 어떤 알림으로 켜졌는지
  lastUpdatedAt: Timestamp;
}

/**
 * 자동 완화 플래그 적용
 * 
 * @param params 통계 및 심각도 정보
 * @returns 적용된 플래그 목록
 */
export async function applyAutoMitigationFlags(params: {
  smsFailRate: number;
  expiredRate: number;
  mobileFail: number;
  desktopFail: number;
  level: "warning" | "critical";
  alertReason?: string;
}): Promise<string[]> {
  // Critical 레벨에서만 작동
  if (params.level !== "critical") {
    logger.info("⏭️ [qrLoginAutoMitigation] Warning 레벨 → 자동 완화 스킵");
    return [];
  }

  const ref = db.doc("featureFlags/qrLoginAutoMitigation");
  const nowTs = Timestamp.now();
  const ttlMinutes = 30; // 기본 30분
  const expiresAt = Timestamp.fromMillis(
    Date.now() + ttlMinutes * 60 * 1000
  );

  const appliedFlags: string[] = [];
  const update: Partial<QRLoginMitigationFlags> = {
    lastUpdatedAt: nowTs,
  };

  // 룰 1: SMS 실패율 > 7% → SMS UX Variant v2
  if (params.smsFailRate > 7) {
    update.smsUXVariant = "v2";
    update.enabledAt = nowTs;
    update.expiresAt = expiresAt;
    update.reason = params.alertReason || `SMS 실패율 ${params.smsFailRate.toFixed(1)}% (Critical)`;
    appliedFlags.push("smsUXVariant=v2");
    logger.info("🔧 [qrLoginAutoMitigation] SMS UX Variant v2 활성화");
    
    // 실험 생성
    try {
      await createExperiment("smsUXVariant_v2", ttlMinutes, update.reason);
    } catch (error: any) {
      logger.warn("⚠️ [qrLoginAutoMitigation] 실험 생성 실패:", error.message);
    }
  }

  // 룰 2: 만료율 > 15% → QR 만료 시간 +60초
  if (params.expiredRate > 15) {
    update.extendedExpireSec = 60; // +1분
    if (!update.enabledAt) {
      update.enabledAt = nowTs;
      update.expiresAt = expiresAt;
      update.reason = params.alertReason || `만료율 ${params.expiredRate.toFixed(1)}% (Critical)`;
    }
    appliedFlags.push("extendedExpireSec=+60s");
    logger.info("⏰ [qrLoginAutoMitigation] QR 만료 시간 +60초 활성화");
    
    // 실험 생성
    try {
      await createExperiment("extendedExpire", ttlMinutes, update.reason || `만료율 ${params.expiredRate.toFixed(1)}%`);
    } catch (error: any) {
      logger.warn("⚠️ [qrLoginAutoMitigation] 실험 생성 실패:", error.message);
    }
  }

  // 룰 3: 모바일 실패 비중 높음 → 모바일 UX Boost
  if (params.mobileFail > params.desktopFail && params.mobileFail > 0) {
    update.mobileUXBoost = true;
    if (!update.enabledAt) {
      update.enabledAt = nowTs;
      update.expiresAt = expiresAt;
      update.reason = params.alertReason || `모바일 실패 비중 높음 (Critical)`;
    }
    appliedFlags.push("mobileUXBoost=true");
    logger.info("📱 [qrLoginAutoMitigation] 모바일 UX Boost 활성화");
    
    // 실험 생성
    try {
      await createExperiment("mobileUXBoost", ttlMinutes, update.reason || `모바일 실패 비중 높음`);
    } catch (error: any) {
      logger.warn("⚠️ [qrLoginAutoMitigation] 실험 생성 실패:", error.message);
    }
  }

  // 플래그가 적용된 경우에만 업데이트
  if (appliedFlags.length > 0) {
    // 기존 문서가 있으면 merge, 없으면 생성
    const existing = await ref.get();
    if (existing.exists) {
      const existingData = existing.data() as QRLoginMitigationFlags;
      // 기존 플래그가 만료되지 않았으면 유지, 만료되었으면 새로 설정
      if (existingData.expiresAt && existingData.expiresAt.toMillis() > Date.now()) {
        // 기존 플래그가 아직 유효하면 merge
        await ref.set(update, { merge: true });
      } else {
        // 기존 플래그가 만료되었으면 새로 설정
        await ref.set(update, { merge: true });
      }
    } else {
      // 새로 생성
      await ref.set(update, { merge: true });
    }

    logger.info("✅ [qrLoginAutoMitigation] 자동 완화 플래그 적용 완료:", {
      flags: appliedFlags,
      expiresAt: expiresAt.toDate().toISOString(),
    });
  }

  return appliedFlags;
}

/**
 * 만료된 플래그 자동 원복
 */
export async function resetExpiredMitigationFlags(): Promise<boolean> {
  try {
    const ref = db.doc("featureFlags/qrLoginAutoMitigation");
    const snap = await ref.get();

    if (!snap.exists) {
      return false;
    }

    const data = snap.data() as QRLoginMitigationFlags;
    const expiresAt = data.expiresAt;

    // expiresAt이 없거나 이미 만료된 경우 원복
    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
      await ref.set(
        {
          smsUXVariant: null,
          extendedExpireSec: null,
          mobileUXBoost: false,
          enabledAt: null,
          expiresAt: null,
          reason: null,
          lastUpdatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      logger.info("✅ [qrLoginAutoMitigation] 만료된 플래그 자동 원복 완료");
      return true;
    }

    return false;
  } catch (error: any) {
    logger.error("❌ [qrLoginAutoMitigation] 플래그 원복 실패:", {
      error: error.message,
    });
    return false;
  }
}

/**
 * 현재 활성화된 플래그 조회
 */
export async function getActiveMitigationFlags(): Promise<QRLoginMitigationFlags | null> {
  try {
    const ref = db.doc("featureFlags/qrLoginAutoMitigation");
    const snap = await ref.get();

    if (!snap.exists) {
      return null;
    }

    const data = snap.data() as QRLoginMitigationFlags;
    const expiresAt = data.expiresAt;

    // 만료되었으면 null 반환
    if (!expiresAt || expiresAt.toMillis() < Date.now()) {
      return null;
    }

    return data;
  } catch (error: any) {
    logger.error("❌ [qrLoginAutoMitigation] 플래그 조회 실패:", {
      error: error.message,
    });
    return null;
  }
}
