/**
 * 🔥 초대 이벤트 로그 유틸 (I단계 LOCK v1)
 * 
 * 단일 스키마 기반 퍼널 관측 + 운영 로그 + 장애 대응
 * "어디서 막히는지" 대시보드용 이벤트
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as crypto from "crypto";
import { getDbForTeam, getCoreDb } from "./regionRouter";

const defaultDb = getFirestore();

// 🔥 I-1: 이벤트 단일 스키마 (절대 분산 금지)
export type InviteEventType =
  | "invite_created"
  | "invite_preview_opened"
  | "invite_join_attempt"
  | "invite_join_success"
  | "invite_join_failed";

interface InviteEvent {
  type: InviteEventType;
  inviteId: string;
  teamId: string;
  uid?: string;
  plan?: string;
  errorCode?: string;
  ua?: string;
  ipHash?: string; // 🔥 I-1: IP 해시 (개인정보 보호)
  createdAt: Timestamp;
}

/**
 * IP 해시 생성 (개인정보 보호)
 */
function hashIP(ip: string): string {
  if (!ip || ip === "unknown") return "";
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

/**
 * 초대 이벤트 기록 (서버용)
 */
export async function logInviteEvent(
  data: Omit<InviteEvent, "createdAt">
): Promise<void> {
  try {
    // 🔥 M-5: 팀 리전 DB에 저장
    let regionDb = defaultDb;
    if (data.teamId) {
      try {
        regionDb = await getDbForTeam(data.teamId);
      } catch (err) {
        // 리전 조회 실패 시 기본 DB 사용
        logger.warn("⚠️ [logInviteEvent] 리전 조회 실패, 기본 DB 사용", { teamId: data.teamId, error: err });
      }
    }

    await regionDb.collection("inviteEvents").add({
      type: data.type,
      inviteId: data.inviteId,
      teamId: data.teamId,
      uid: data.uid || null,
      plan: data.plan || null,
      errorCode: data.errorCode || null,
      ua: data.ua || null,
      ipHash: data.ipHash || null,
      createdAt: Timestamp.now(),
    });

    logger.info("✅ [inviteEvent] 이벤트 기록", {
      type: data.type,
      inviteId: data.inviteId,
      errorCode: data.errorCode,
    });
  } catch (error: any) {
    // 로그 기록 실패는 무시 (소프트 실패)
    logger.warn("⚠️ [inviteEvent] 로그 기록 실패:", error);
  }
}

/**
 * 초대 생성 이벤트 기록
 */
export async function logInviteCreated(
  inviteId: string,
  teamId: string,
  uid: string,
  plan: string
): Promise<void> {
  await logInviteEvent({
    type: "invite_created",
    inviteId,
    teamId,
    uid,
    plan,
  });
}

/**
 * 초대 합류 성공 이벤트 기록
 */
export async function logInviteJoinSuccess(
  inviteId: string,
  teamId: string,
  uid: string,
  ua?: string,
  ip?: string
): Promise<void> {
  await logInviteEvent({
    type: "invite_join_success",
    inviteId,
    teamId,
    uid,
    ua,
    ipHash: ip ? hashIP(ip) : undefined,
  });
}

/**
 * 초대 합류 실패 이벤트 기록
 * 🔥 I-2: 실패 로그를 "삼키지 않는 것"이 핵심
 */
export async function logInviteJoinFailed(
  inviteId: string,
  teamId: string,
  uid: string | undefined,
  errorCode: string,
  ua?: string,
  ip?: string
): Promise<void> {
  await logInviteEvent({
    type: "invite_join_failed",
    inviteId,
    teamId,
    uid,
    errorCode,
    ua,
    ipHash: ip ? hashIP(ip) : undefined,
  });
}

