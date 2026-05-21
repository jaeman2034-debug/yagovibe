/**
 * 🔥 joinTeam Rate Limit 유틸 (E-1)
 * 
 * UA + IP 기반 소프트 Rate Limit
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as crypto from "crypto";
import { extractRequestInfo } from "./utils/auditLog";

const db = getFirestore();

/**
 * IP + UA 해시 생성
 */
function generateRateLimitKey(ip: string, ua: string): string {
  const combined = `${ip}|${ua}`;
  return crypto.createHash("sha256").update(combined).digest("hex").substring(0, 16);
}

/**
 * joinTeam Rate Limit 체크
 * 
 * @param ip 클라이언트 IP
 * @param ua User-Agent
 * @returns true면 허용, false면 차단
 */
export async function checkJoinTeamRateLimit(
  ip: string,
  ua: string
): Promise<{ allowed: boolean; reason?: string }> {
  const nowMs = Date.now();
  const windowMs = 60 * 1000; // 1분
  const limit = 10; // 1분당 10회

  const rateLimitKey = generateRateLimitKey(ip, ua);
  const rateLimitRef = db.collection("joinLogs").doc(rateLimitKey);

  try {
    // 최근 시도 기록 조회
    const recentLogsRef = db
      .collection("joinLogs")
      .doc(rateLimitKey)
      .collection("attempts")
      .where("timestamp", ">", Timestamp.fromMillis(nowMs - windowMs));

    const recentLogsSnap = await recentLogsRef.get();

    if (recentLogsSnap.size >= limit) {
      return {
        allowed: false,
        reason: "RESOURCE_EXHAUSTED",
      };
    }

    // 시도 기록 추가
    await db
      .collection("joinLogs")
      .doc(rateLimitKey)
      .collection("attempts")
      .add({
        timestamp: Timestamp.fromMillis(nowMs),
        ip,
        ua,
      });

    // 메인 문서 업데이트 (최근 시도 시간)
    await rateLimitRef.set(
      {
        lastAttempt: Timestamp.fromMillis(nowMs),
        ip,
        ua,
      },
      { merge: true }
    );

    return { allowed: true };
  } catch (error: any) {
    // Rate limit 체크 실패는 허용 (소프트 실패)
    console.warn("⚠️ [joinTeamRateLimit] Rate limit 체크 실패, 허용:", error);
    return { allowed: true };
  }
}

