/**
 * 🔥 매칭 무결성 자동 보정 봇 (운영 안정화)
 * 
 * 역할:
 * - 매일 새벽 4시 자동 실행
 * - currentPeople ↔ approved 수 불일치 감지
 * - 자동 보정 처리
 * - 보정 로그 기록
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { admin as firebaseAdmin } from "../firebaseAdmin";

const db = firebaseAdmin.firestore();

type FixResult = {
  postId: string;
  before: {
    currentPeople?: number;
    status?: string;
    maxPeople?: number;
  };
  after: {
    currentPeople: number;
    status?: string;
    isFull?: boolean;
  };
  approvedCount: number;
  fixedFields: string[];
};

const BATCH_LIMIT = 400; // 안전하게 쪼개기 (읽기/쓰기 비용 고려)

/**
 * 매일 새벽 4시 무결성 보정 실행
 */
export const nightlyIntegrityFix = onSchedule(
  {
    schedule: "0 4 * * *",
    timeZone: "Asia/Seoul",
    retryCount: 1,
    region: "asia-northeast3",
  },
  async () => {
    logger.info("[IntegrityBot] 시작");

    const startedAt = admin.firestore.Timestamp.now();
    const fixes: FixResult[] = [];
    let scanned = 0;

    // 🔥 최근 7일 게시글만 처리 (운영 최적화)
    const sevenDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    // 🔥 최근 업데이트된 게시글 조회
    const postsSnap = await db
      .collection("market")
      .where("updatedAt", ">=", sevenDaysAgo)
      .limit(BATCH_LIMIT)
      .get();

    scanned += postsSnap.size;

    logger.info(`[IntegrityBot] 스캔 대상: ${scanned}개 게시글`);

    // 🔥 각 게시글 무결성 체크
    for (const postDoc of postsSnap.docs) {
      try {
        const postId = postDoc.id;
        const post = postDoc.data();

        const maxPeople = typeof post.people === "number" ? post.people : 0;
        const currentPeople =
          typeof post.currentPeople === "number" ? post.currentPeople : 0;
        const status = typeof post.status === "string" ? post.status : undefined;

        // 🔥 실제 승인 수 조회
        const approvedSnap = await db
          .collection("marketJoins")
          .where("postId", "==", postId)
          .where("status", "==", "approved")
          .get();

        const approvedCount = approvedSnap.size;

        // 🔥 정합성 계산
        const shouldCurrentPeople = approvedCount;
        const shouldIsFull = maxPeople > 0 ? approvedCount >= maxPeople : false;
        const shouldStatus =
          maxPeople > 0 && approvedCount >= maxPeople ? "full" : "open";

        const updates: Record<string, any> = {};
        const fixedFields: string[] = [];

        // 🔥 currentPeople 보정
        if (currentPeople !== shouldCurrentPeople) {
          updates.currentPeople = shouldCurrentPeople;
          fixedFields.push("currentPeople");
        }

        // 🔥 status 보정 (필드가 있는 경우)
        if (status && status !== shouldStatus) {
          updates.status = shouldStatus;
          fixedFields.push("status");
        }

        // 🔥 isFull 보정 (필드가 있는 경우)
        if (typeof post.isFull === "boolean" && post.isFull !== shouldIsFull) {
          updates.isFull = shouldIsFull;
          fixedFields.push("isFull");
        }

        // 🔥 보정 필요 시 업데이트
        if (fixedFields.length > 0) {
          updates.correctedAt = admin.firestore.FieldValue.serverTimestamp();
          updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

          await db.collection("market").doc(postId).update(updates);

          fixes.push({
            postId,
            before: { currentPeople, status, maxPeople },
            after: {
              currentPeople: shouldCurrentPeople,
              status: status ? shouldStatus : undefined,
              isFull: typeof post.isFull === "boolean" ? shouldIsFull : undefined,
            },
            approvedCount,
            fixedFields,
          });

          logger.info(`[IntegrityBot] 보정 완료: ${postId}`, {
            fixedFields,
            before: currentPeople,
            after: shouldCurrentPeople,
          });
        }
      } catch (error: any) {
        logger.error(`[IntegrityBot] 게시글 ${postDoc.id} 보정 실패:`, {
          error: error.message,
          stack: error.stack,
        });
      }
    }

    // 🔥 로그 저장 (한 번에 1문서로 요약)
    await db.collection("_marketIntegrityLogs").add({
      type: "INTEGRITY_FIX",
      startedAt,
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      scanned,
      fixedCount: fixes.length,
      fixes: fixes.slice(0, 50), // 너무 커지면 일부만 저장
    });

    logger.info("[IntegrityBot] 완료", {
      scanned,
      fixedCount: fixes.length,
    });
  }
);
