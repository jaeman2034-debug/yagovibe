/**
 * 🔥 매일 04:00 무결성 보정 봇 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 매일 새벽 4시 자동 실행
 * - currentPeople ↔ approved 수 불일치 감지
 * - 자동 보정 처리
 * - 보정 로그 기록
 * 
 * 규모 커지면 "최근 N일"만 보정 추천
 * 보정 로그는 `/ops_logs`에 요약 저장
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "./firebase";

const BATCH_LIMIT = 500;

export const nightlyIntegrityFix = onSchedule(
  {
    schedule: "0 4 * * *",
    timeZone: "Asia/Seoul",
    retryCount: 1,
    region: "asia-northeast3",
  },
  async () => {
    const startedAt = Timestamp.now();
    logger.info("[IntegrityBot] start");

    const fixes: any[] = [];

    // 초기 운영: 최근 업데이트된 글만 보정 추천 (updatedAt 없으면 전체)
    const sevenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    let postsQuery = db.collection("market").limit(BATCH_LIMIT);
    // updatedAt 있으면 아래 주석 해제
    // postsQuery = db.collection("market").where("updatedAt", ">=", sevenDaysAgo).limit(BATCH_LIMIT);

    const postsSnap = await postsQuery.get();

    for (const postDoc of postsSnap.docs) {
      const postId = postDoc.id;
      const post = postDoc.data() as any;

      const maxPeople = typeof post.people === "number" ? post.people : 0;
      const currentPeople =
        typeof post.currentPeople === "number" ? post.currentPeople : 0;

      const approvedSnap = await db
        .collection("marketJoins")
        .where("postId", "==", postId)
        .where("status", "==", "approved")
        .get();

      const approvedCount = approvedSnap.size;

      const shouldCurrent = approvedCount;
      const shouldIsFull = maxPeople > 0 ? approvedCount >= maxPeople : false;
      const shouldStatus = shouldIsFull ? "full" : "open";

      const updates: Record<string, any> = {};
      const fixedFields: string[] = [];

      if (currentPeople !== shouldCurrent) {
        updates.currentPeople = shouldCurrent;
        fixedFields.push("currentPeople");
      }

      if (typeof post.isFull === "boolean" && post.isFull !== shouldIsFull) {
        updates.isFull = shouldIsFull;
        fixedFields.push("isFull");
      }

      if (typeof post.status === "string" && post.status !== shouldStatus) {
        updates.status = shouldStatus;
        fixedFields.push("status");
      }

      if (fixedFields.length) {
        updates.correctedAt = FieldValue.serverTimestamp();
        updates.updatedAt = FieldValue.serverTimestamp();
        await db.collection("market").doc(postId).update(updates);

        fixes.push({
          postId,
          fixedFields,
          before: { currentPeople },
          after: { currentPeople: shouldCurrent },
        });
      }
    }

    await db.collection("ops_logs").add({
      type: "INTEGRITY_FIX",
      startedAt,
      finishedAt: FieldValue.serverTimestamp(),
      scanned: postsSnap.size,
      fixedCount: fixes.length,
      fixes: fixes.slice(0, 50),
    });

    logger.info("[IntegrityBot] done", {
      scanned: postsSnap.size,
      fixedCount: fixes.length,
    });
  }
);
