/**
 * 🔥 초대 감사 로그 유틸 (E-5)
 * 
 * 미래 디버깅용 로그 설계
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

type InviteEvent = "created" | "used" | "revoked" | "expired";

interface InviteAuditLogData {
  inviteId: string;
  event: InviteEvent;
  uid?: string;
  ua?: string;
  ip?: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * 초대 감사 로그 기록
 */
export async function writeInviteAuditLog(
  data: InviteAuditLogData
): Promise<void> {
  try {
    await db.collection("inviteAuditLogs").add({
      inviteId: data.inviteId,
      event: data.event,
      uid: data.uid || null,
      ua: data.ua || null,
      ip: data.ip || null,
      timestamp: data.timestamp,
      metadata: data.metadata || {},
    });

    logger.info("✅ [inviteAuditLog] 로그 기록", {
      inviteId: data.inviteId,
      event: data.event,
      uid: data.uid,
    });
  } catch (error: any) {
    // 로그 기록 실패는 무시 (소프트 실패)
    logger.warn("⚠️ [inviteAuditLog] 로그 기록 실패:", error);
  }
}

