/**
 * 🔥 writeAuditLog - AuditLogs 기록 유틸 (L-1 LOCK v1 + M-5)
 * 
 * L-0 절대 원칙:
 * - Audit Log는 수정/삭제 불가
 * - 업무 데이터와 분리
 * - 서버에서만 기록
 * - 사람이 읽을 수 있어야 함
 * 
 * L-1 단일 스키마:
 * auditLogs/{logId} (전역 컬렉션)
 * 
 * M-5: 리전별 저장
 * - 팀 리전 DB에 저장
 * - coreDB에는 요약 메타만
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as crypto from "crypto";
import { getDbForTeam, getCoreDb } from "./regionRouter";
import { initializeApp, getApps } from "firebase-admin/app";

// 🔥 Firebase Admin 초기화 (안전하게)
if (getApps().length === 0) {
  initializeApp();
}

// 🔥 지연 초기화: 함수 실행 시점에만 호출
let defaultDbInstance: ReturnType<typeof getFirestore> | null = null;
function getDefaultDb() {
  if (!defaultDbInstance) {
    defaultDbInstance = getFirestore();
  }
  return defaultDbInstance;
}

type TargetType = "member" | "team" | "invite" | "plan" | "other";

interface WriteAuditLogParams {
  actorUid: string;
  actorRole?: string; // 당시 역할
  teamId?: string;
  targetUid?: string; // 대상 유저
  targetType?: TargetType;
  action: string; // ex: "team.create", "member.remove", "invite.create"
  summary: string; // 🔥 사람이 읽는 설명 (자연어, 법무/CS/영업이 그대로 사용)
  metadata?: {
    before?: any; // 변경 전 상태
    after?: any; // 변경 후 상태
    [key: string]: any;
  };
  ua?: string;
  ip?: string;
}

/**
 * IP 해시 생성 (개인정보 보호)
 */
function hashIP(ip: string): string {
  if (!ip || ip === "unknown") return "";
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

/**
 * L-3: Audit Log 기록 (트랜잭션 성공 이후에만 호출)
 * 
 * 실패한 액션은 ❌ 기록 안 함
 * → Audit Log = "사실"만
 */
export async function writeAuditLog({
  actorUid,
  actorRole,
  teamId,
  targetUid,
  targetType,
  action,
  summary,
  metadata,
  ua,
  ip,
}: WriteAuditLogParams): Promise<void> {
  try {
    let region = "us"; // 기본값

    // 🔥 M-5: 팀 리전 확인 (teamId가 있는 경우)
    if (teamId) {
      try {
        const coreDb = getCoreDb();
        const teamSnap = await coreDb.collection("teams").doc(teamId).get();
        if (teamSnap.exists) {
          region = teamSnap.data()?.dataRegion || "us";
        }
      } catch (err) {
        // 리전 조회 실패해도 기본값 사용
        logger.warn("⚠️ [writeAuditLog] 리전 조회 실패, 기본값 사용", { teamId, error: err });
      }
    }

    // 🔥 M-5: 팀 리전 DB에 저장
    const regionDb = teamId ? await getDbForTeam(teamId) : getDefaultDb();
    await regionDb.collection("auditLogs").add({
      actorUid,
      actorRole: actorRole || null,
      teamId: teamId || null,
      targetUid: targetUid || null,
      targetType: targetType || null,
      action,
      summary, // 🔥 자연어 설명 (법무/CS/영업이 그대로 사용)
      metadata: metadata || {},
      ua: ua || null,
      ipHash: ip ? hashIP(ip) : null, // 🔥 IP 해시 (개인정보 보호)
      createdAt: Timestamp.now(),
    });

    // 🔥 M-5: coreDB에는 요약 메타만 (선택적)
    if (teamId) {
      try {
        const coreDb = getCoreDb();
        await coreDb.collection("auditIndex").add({
          teamId,
          region,
          action,
          lastEventAt: Timestamp.now(),
          summary: summary.substring(0, 100), // 요약만
        });
      } catch (err) {
        // 인덱스 기록 실패는 무시
        logger.warn("⚠️ [writeAuditLog] 인덱스 기록 실패", { teamId, error: err });
      }
    }

    logger.info("✅ [writeAuditLog] Audit log 기록 완료", {
      action,
      actorUid,
      teamId,
      region,
      summary,
    });
  } catch (error: any) {
    // 🔥 AuditLog 실패가 전체 플로우를 막으면 안 됨
    logger.error("❌ [writeAuditLog] Audit log 기록 실패", {
      action,
      actorUid,
      teamId,
      error: error.message,
    });
    // 에러는 로깅만 하고 throw하지 않음 (비즈니스 로직 영향 없음)
  }
}

/**
 * 🔥 HTTP Request에서 IP, UserAgent 추출 헬퍼
 */
export function extractRequestInfo(req: any): {
  ip?: string;
  userAgent?: string;
} {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    undefined;

  const userAgent = req.headers["user-agent"] || undefined;

  return { ip, userAgent };
}
