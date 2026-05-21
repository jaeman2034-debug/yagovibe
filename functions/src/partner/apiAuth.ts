/**
 * 🔥 파트너 API 인증 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 파트너 등록 및 API 키 발급
 * - 스코프 기반 권한 관리
 * - API 인증 처리
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";
import crypto from "crypto";

/**
 * API 스코프
 */
export type APIScope =
  | "WRITE_ITEM" // 매물 등록
  | "READ_TRADE" // 거래 조회
  | "WRITE_TRADE" // 거래 생성
  | "ADS" // 광고 관리
  | "WEBHOOK"; // 웹훅 설정

/**
 * 파트너 데이터
 */
export interface PartnerData {
  id: string;
  name: string;
  type: "STORE" | "SERVICE" | "LOGISTICS" | "DEVELOPER";
  apiKey: string;
  apiSecret: string;
  scopes: APIScope[];
  webhookUrl?: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  createdAt: Date;
  lastUsedAt?: Date;
  callCount: number; // API 호출 횟수
  revenue: number; // 수익 (거래 수수료 등)
}

/**
 * API 키 생성
 */
function generateAPIKey(): string {
  return `pk_${crypto.randomBytes(32).toString("hex")}`;
}

/**
 * API Secret 생성
 */
function generateAPISecret(): string {
  return `sk_${crypto.randomBytes(64).toString("hex")}`;
}

/**
 * 파트너 등록
 */
export async function registerPartner(
  name: string,
  type: PartnerData["type"],
  scopes: APIScope[],
  webhookUrl?: string
): Promise<{ partnerId: string; apiKey: string; apiSecret: string }> {
  const apiKey = generateAPIKey();
  const apiSecret = generateAPISecret();

  const partnerData = {
    name: name.trim(),
    type,
    apiKey,
    apiSecret,
    scopes,
    webhookUrl,
    status: "ACTIVE" as const,
    createdAt: FieldValue.serverTimestamp(),
    callCount: 0,
    revenue: 0,
  };

  const partnerRef = await db.collection("partners").add(partnerData);
  const partnerId = partnerRef.id;

  logger.info("[registerPartner] 파트너 등록 완료:", {
    partnerId,
    name,
    type,
    scopes,
  });

  return {
    partnerId,
    apiKey,
    apiSecret,
  };
}

/**
 * API 키 검증
 */
export async function verifyAPIKey(
  apiKey: string,
  requiredScopes?: APIScope[]
): Promise<{ valid: boolean; partner?: PartnerData }> {
  const partnersSnap = await db
    .collection("partners")
    .where("apiKey", "==", apiKey)
    .where("status", "==", "ACTIVE")
    .limit(1)
    .get();

  if (partnersSnap.empty) {
    return { valid: false };
  }

  const partnerDoc = partnersSnap.docs[0];
  const partner = {
    id: partnerDoc.id,
    ...partnerDoc.data(),
  } as PartnerData;

  // 🔥 스코프 확인
  if (requiredScopes && requiredScopes.length > 0) {
    const hasAllScopes = requiredScopes.every((scope) =>
      partner.scopes.includes(scope)
    );
    if (!hasAllScopes) {
      logger.warn("[verifyAPIKey] 스코프 부족:", {
        partnerId: partner.id,
        required: requiredScopes,
        has: partner.scopes,
      });
      return { valid: false, partner };
    }
  }

  // 🔥 마지막 사용 시간 업데이트
  await db.collection("partners").doc(partner.id).update({
    lastUsedAt: FieldValue.serverTimestamp(),
    callCount: FieldValue.increment(1),
  });

  return { valid: true, partner };
}

/**
 * API 호출 기록 (과금용)
 */
export async function recordAPICall(
  partnerId: string,
  endpoint: string,
  cost: number = 0.01 // 기본 호출 비용
): Promise<void> {
  await db.collection("partners").doc(partnerId).update({
    callCount: FieldValue.increment(1),
    revenue: FieldValue.increment(-cost), // 파트너가 지불하는 비용
  });

  // 🔥 API 호출 로그
  await db.collection("apiLogs").add({
    partnerId,
    endpoint,
    cost,
    timestamp: FieldValue.serverTimestamp(),
  });
}
