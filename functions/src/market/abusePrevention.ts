/**
 * 🔥 악성 방어 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 신청 쿨타임 체크 (10분)
 * - 다중 신청 차단
 * - 일일 신청 제한 (5회)
 * - 신고 기반 자동 추방
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

const COOLDOWN_MINUTES = 10; // 쿨타임: 10분
const DAILY_LIMIT = 5; // 일일 신청 제한: 5회
const AUTO_KICK_REPORT_THRESHOLD = 3; // 자동 추방 신고 임계값: 3회

/**
 * 신청 쿨타임 체크
 */
async function checkCooldown(userId: string): Promise<boolean> {
  const tenMinutesAgo = Timestamp.fromDate(
    new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000)
  );

  const recentJoins = await db
    .collection("marketJoins")
    .where("userId", "==", userId)
    .where("createdAt", ">=", tenMinutesAgo)
    .limit(1)
    .get();

  return recentJoins.empty;
}

/**
 * 일일 신청 제한 체크
 */
async function checkDailyLimit(userId: string): Promise<boolean> {
  const todayStart = Timestamp.fromDate(
    new Date(new Date().setHours(0, 0, 0, 0))
  );

  const todayJoins = await db
    .collection("marketJoins")
    .where("userId", "==", userId)
    .where("createdAt", ">=", todayStart)
    .get();

  return todayJoins.size < DAILY_LIMIT;
}

/**
 * 다중 신청 차단 (같은 게시글에 대한 중복 신청)
 */
async function checkDuplicateJoin(postId: string, userId: string): Promise<boolean> {
  const joinId = `${postId}_${userId}`;
  const joinDoc = await db.collection("marketJoins").doc(joinId).get();

  if (!joinDoc.exists) {
    return true; // 중복 없음
  }

  const joinData = joinDoc.data();
  // pending 또는 approved 상태면 중복
  return joinData?.status !== "pending" && joinData?.status !== "approved";
}

/**
 * 신고 기반 자동 추방
 */
async function checkAutoKick(userId: string, postId: string): Promise<boolean> {
  const reports = await db
    .collection("reports")
    .where("targetUserId", "==", userId)
    .where("postId", "==", postId)
    .where("resolved", "==", false)
    .get();

  return reports.size >= AUTO_KICK_REPORT_THRESHOLD;
}

/**
 * 참여 신청 생성 시 악성 방어 체크
 * 
 * 트리거: marketJoins/{joinId} 문서 생성
 */
export const onMarketJoinCreated = onDocumentCreated(
  {
    document: "marketJoins/{joinId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const joinData = event.data?.data();
    const joinId = event.params.joinId as string;

    if (!joinData) {
      logger.info("[onMarketJoinCreated] 데이터 없음:", { joinId });
      return;
    }

    const postId = joinData.postId;
    const userId = joinData.userId;
    const status = joinData.status;

    // 🔥 pending 상태만 체크
    if (status !== "pending") {
      return;
    }

    logger.info("[onMarketJoinCreated] 참여 신청 생성 감지:", {
      joinId,
      postId,
      userId,
    });

    try {
      // 🔥 1. 쿨타임 체크
      const hasCooldown = await checkCooldown(userId);
      if (!hasCooldown) {
        logger.warn("[onMarketJoinCreated] 쿨타임 위반:", { userId, postId });
        await db.collection("marketJoins").doc(joinId).update({
          status: "rejected",
          rejectedReason: "RATE_LIMIT",
          updatedAt: FieldValue.serverTimestamp(),
          rejectedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // 🔥 2. 일일 제한 체크
      const withinDailyLimit = await checkDailyLimit(userId);
      if (!withinDailyLimit) {
        logger.warn("[onMarketJoinCreated] 일일 제한 초과:", { userId, postId });
        await db.collection("marketJoins").doc(joinId).update({
          status: "rejected",
          rejectedReason: "DAILY_LIMIT",
          updatedAt: FieldValue.serverTimestamp(),
          rejectedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // 🔥 3. 중복 신청 체크 (Firestore Rules에서도 체크하지만, 서버에서도 확인)
      const isNotDuplicate = await checkDuplicateJoin(postId, userId);
      if (!isNotDuplicate) {
        logger.warn("[onMarketJoinCreated] 중복 신청:", { userId, postId });
        await db.collection("marketJoins").doc(joinId).update({
          status: "rejected",
          rejectedReason: "DUPLICATE",
          updatedAt: FieldValue.serverTimestamp(),
          rejectedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // 🔥 4. 신고 기반 자동 추방 체크
      const shouldKick = await checkAutoKick(userId, postId);
      if (shouldKick) {
        logger.warn("[onMarketJoinCreated] 자동 추방:", { userId, postId });
        await db.collection("marketJoins").doc(joinId).update({
          status: "rejected",
          rejectedReason: "AUTO_KICK",
          updatedAt: FieldValue.serverTimestamp(),
          rejectedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      logger.info("[onMarketJoinCreated] 악성 방어 체크 통과:", {
        joinId,
        postId,
        userId,
      });
    } catch (error: any) {
      logger.error("[onMarketJoinCreated] 악성 방어 체크 실패:", {
        joinId,
        postId,
        userId,
        error: error.message,
        stack: error.stack,
      });
      // 실패해도 메인 로직은 계속 진행 (Fail-safe)
    }
  }
);
