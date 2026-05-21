/**
 * 🔥 통계 엔진 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 매일 새벽 5시 통계 집계
 * - 승인율, 이탈률, 평균 대기 시간 계산
 * - posts 문서에 통계 필드 업데이트
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

const BATCH_LIMIT = 500;

/**
 * 매일 새벽 5시 통계 집계 실행
 */
export const dailyStatsJob = onSchedule(
  {
    schedule: "0 5 * * *",
    timeZone: "Asia/Seoul",
    retryCount: 1,
    region: "asia-northeast3",
  },
  async () => {
    logger.info("[StatsBot] 시작");

    const startedAt = Timestamp.now();
    const stats: any[] = [];

    // 🔥 최근 7일 게시글만 처리 (운영 최적화)
    const sevenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const postsSnap = await db
      .collection("market")
      .where("updatedAt", ">=", sevenDaysAgo)
      .limit(BATCH_LIMIT)
      .get();

    for (const postDoc of postsSnap.docs) {
      try {
        const postId = postDoc.id;
        const post = postDoc.data() as any;

        // 🔥 참여 신청 목록 조회
        const joinsSnap = await db
          .collection("marketJoins")
          .where("postId", "==", postId)
          .get();

        const joins = joinsSnap.docs.map((d) => d.data());

        // 🔥 통계 계산
        const totalJoins = joins.length;
        const approvedJoins = joins.filter((j) => j.status === "approved").length;
        const rejectedJoins = joins.filter((j) => j.status === "rejected").length;
        const cancelledJoins = joins.filter(
          (j) => j.status === "cancelled_by_user" || j.status === "cancelled_by_author"
        ).length;

        // 승인율
        const approvedRate = totalJoins > 0 ? approvedJoins / totalJoins : 0;

        // 이탈률 (승인 후 취소)
        const leaveRate = approvedJoins > 0 ? cancelledJoins / approvedJoins : 0;

        // 평균 대기 시간 (pending → approved)
        const waitTimes: number[] = [];
        joins.forEach((join) => {
          if (join.status === "approved" && join.promotedAt && join.createdAt) {
            const waitTime =
              join.promotedAt.toMillis() - join.createdAt.toMillis();
            if (waitTime > 0) {
              waitTimes.push(waitTime);
            }
          }
        });
        const avgWaitMin =
          waitTimes.length > 0
            ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length / (1000 * 60)
            : 0;

        // 🔥 통계 업데이트
        await db.collection("market").doc(postId).update({
          stats: {
            joinCount: totalJoins,
            approvedCount: approvedJoins,
            rejectedCount: rejectedJoins,
            cancelledCount: cancelledJoins,
            approvedRate: Math.round(approvedRate * 100) / 100, // 소수점 2자리
            leaveRate: Math.round(leaveRate * 100) / 100,
            avgWaitMin: Math.round(avgWaitMin * 10) / 10, // 소수점 1자리
          },
          statsUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        stats.push({
          postId,
          totalJoins,
          approvedRate,
          leaveRate,
          avgWaitMin,
        });

        logger.info(`[StatsBot] 통계 업데이트 완료: ${postId}`, {
          totalJoins,
          approvedRate,
          leaveRate,
          avgWaitMin,
        });
      } catch (error: any) {
        logger.error(`[StatsBot] 게시글 ${postDoc.id} 통계 계산 실패:`, {
          error: error.message,
          stack: error.stack,
        });
      }
    }

    // 🔥 통계 요약 로그 저장
    await db.collection("ops_logs").add({
      type: "STATS_AGGREGATION",
      startedAt,
      finishedAt: FieldValue.serverTimestamp(),
      scanned: postsSnap.size,
      processedCount: stats.length,
      stats: stats.slice(0, 50), // 일부만 저장
    });

    logger.info("[StatsBot] 완료", {
      scanned: postsSnap.size,
      processedCount: stats.length,
    });
  }
);
