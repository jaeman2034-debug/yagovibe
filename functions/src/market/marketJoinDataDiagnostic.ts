/**
 * 🔥 매칭 참여 시스템 데이터 진단 도구 (배포 직전 점검)
 * 
 * 사용법:
 * ```bash
 * firebase functions:shell
 * > diagnoseMarketJoinData({ postId: "xxx" })
 * ```
 * 
 * 또는 HTTP 호출:
 * ```bash
 * curl -X POST https://asia-northeast3-{project}.cloudfunctions.net/diagnoseMarketJoinData \
 *   -H "Content-Type: application/json" \
 *   -d '{"data": {"postId": "xxx"}}'
 * ```
 */

import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { admin as firebaseAdmin } from "../firebaseAdmin";

const db = firebaseAdmin.firestore();

interface DiagnosticResult {
  postId: string;
  issues: string[];
  warnings: string[];
  data: {
    post: any;
    joins: any[];
    actualCount: number;
    expectedCount: number;
    fieldMapping: {
      currentPeople: any;
      people: any;
      joined?: any;
      max?: any;
    };
  };
  fixes: string[];
  fixed: boolean;
}

/**
 * 데이터 진단 실행
 */
export const diagnoseMarketJoinData = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 1,
  },
  async (request) => {
    const postId = request.data?.postId;

    if (!postId) {
      throw new Error("postId가 필요합니다.");
    }

    logger.info("[diagnoseMarketJoinData] 진단 시작:", { postId });

    try {
      const result = await performDiagnostic(postId);
      return result;
    } catch (error: any) {
      logger.error("[diagnoseMarketJoinData] 진단 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }
);

/**
 * 전체 게시글 진단 (관리자용)
 */
export const diagnoseAllMarketPosts = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 1,
  },
  async (request) => {
    // 🔥 관리자만 실행 가능
    if (!request.auth || !request.auth.token.admin) {
      throw new Error("관리자만 실행 가능합니다.");
    }

    logger.info("[diagnoseAllMarketPosts] 전체 진단 시작");

    try {
      const postsSnap = await db
        .collection("market")
        .where("category", "in", ["recruit", "match"])
        .limit(100)
        .get();

      const results: DiagnosticResult[] = [];

      for (const doc of postsSnap.docs) {
        try {
          const result = await performDiagnostic(doc.id);
          results.push(result);
        } catch (error: any) {
          logger.warn("[diagnoseAllMarketPosts] 개별 진단 실패:", {
            postId: doc.id,
            error: error.message,
          });
        }
      }

      const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
      const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
      const fixedCount = results.filter((r) => r.fixed).length;

      logger.info("[diagnoseAllMarketPosts] 전체 진단 완료:", {
        total: results.length,
        totalIssues,
        totalWarnings,
        fixedCount: fixedCount,
      });

      return {
        success: true,
        total: results.length,
        totalIssues,
        totalWarnings,
        fixedCount,
        results,
      };
    } catch (error: any) {
      logger.error("[diagnoseAllMarketPosts] 전체 진단 실패:", {
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }
);

/**
 * 자동 수정 실행
 */
export const fixMarketJoinData = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 1,
  },
  async (request) => {
    // 🔥 관리자만 실행 가능
    if (!request.auth || !request.auth.token.admin) {
      throw new Error("관리자만 실행 가능합니다.");
    }

    const postId = request.data?.postId;
    const autoFix = request.data?.autoFix !== false; // 기본값: true

    if (!postId) {
      throw new Error("postId가 필요합니다.");
    }

    logger.info("[fixMarketJoinData] 수정 시작:", { postId, autoFix });

    try {
      const diagnostic = await performDiagnostic(postId);
      const fixes = await applyFixes(diagnostic, autoFix);

      return {
        success: true,
        diagnostic,
        fixes,
      };
    } catch (error: any) {
      logger.error("[fixMarketJoinData] 수정 실패:", {
        postId,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }
);

/**
 * 진단 수행
 */
async function performDiagnostic(postId: string): Promise<DiagnosticResult> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const fixes: string[] = [];

  // 1. 게시글 조회
  const postRef = db.collection("market").doc(postId);
  const postSnap = await postRef.get();

  if (!postSnap.exists) {
    throw new Error(`게시글을 찾을 수 없습니다: ${postId}`);
  }

  const post = postSnap.data()!;

  // 2. 필드 매핑 확인
  const fieldMapping = {
    currentPeople: post.currentPeople,
    people: post.people,
    joined: (post as any).joined, // 옛날 필드
    max: (post as any).max, // 옛날 필드
  };

  // 3. 실제 신청 수 집계
  const joinsSnap = await db
    .collection("marketJoins")
    .where("postId", "==", postId)
    .get();

  const joins = joinsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Array<{ id: string; status?: string; userId?: string }>;

  // 4. 실제 카운트 계산
  const approvedCount = joins.filter((j) => j.status === "approved").length;
  const pendingCount = joins.filter((j) => j.status === "pending").length;
  const actualCount = approvedCount + pendingCount; // pending도 currentPeople에 포함됨

  // 5. 예상 카운트 (post.currentPeople)
  const expectedCount = post.currentPeople || 0;

  // 6. 문제 진단

  // 6-1. currentPeople 불일치
  if (actualCount !== expectedCount) {
    issues.push(
      `currentPeople 불일치: DB=${expectedCount}, 실제=${actualCount} (approved=${approvedCount}, pending=${pendingCount})`
    );
    fixes.push(`post.currentPeople를 ${actualCount}로 수정`);
  }

  // 6-2. people 필드 없음
  if (!post.people || post.people <= 0) {
    issues.push(`people 필드가 없거나 0 이하: ${post.people}`);
    fixes.push(`post.people를 적절한 값으로 설정 필요`);
  }

  // 6-3. currentPeople > people
  if (post.currentPeople && post.people && post.currentPeople > post.people) {
    issues.push(
      `currentPeople(${post.currentPeople}) > people(${post.people}) - 마감 초과`
    );
    fixes.push(`post.currentPeople를 ${post.people}로 제한`);
  }

  // 6-4. 옛날 필드 사용 (joined, max)
  if ((post as any).joined !== undefined) {
    warnings.push(`옛날 필드 'joined' 발견: ${(post as any).joined} (currentPeople 사용 권장)`);
  }
  if ((post as any).max !== undefined) {
    warnings.push(`옛날 필드 'max' 발견: ${(post as any).max} (people 사용 권장)`);
  }

  // 6-5. status와 currentPeople 불일치
  const isFull = post.people && post.currentPeople && post.currentPeople >= post.people;
  if (isFull && post.status !== "done") {
    warnings.push(`마감 상태인데 status가 'done'이 아님: ${post.status}`);
    fixes.push(`post.status를 'done'으로 변경`);
  }

  // 6-6. 신청 목록이 비어있는데 currentPeople > 0
  if (joins.length === 0 && post.currentPeople > 0) {
    issues.push(`신청 목록이 비어있는데 currentPeople=${post.currentPeople}`);
    fixes.push(`post.currentPeople를 0으로 수정`);
  }

  // 6-7. 중복 신청 확인 (같은 userId로 여러 개)
  const userIdMap = new Map<string, number>();
  joins.forEach((join) => {
    const count = userIdMap.get(join.userId) || 0;
    userIdMap.set(join.userId, count + 1);
  });

  userIdMap.forEach((count, userId) => {
    if (count > 1) {
      issues.push(`중복 신청 발견: userId=${userId}, count=${count}`);
      fixes.push(`중복 신청 정리 필요 (userId=${userId})`);
    }
  });

  return {
    postId,
    issues,
    warnings,
    data: {
      post,
      joins,
      actualCount,
      expectedCount,
      fieldMapping,
    },
    fixes,
    fixed: false,
  };
}

/**
 * 수정 적용
 */
async function applyFixes(
  diagnostic: DiagnosticResult,
  autoFix: boolean
): Promise<string[]> {
  const applied: string[] = [];
  const postRef = db.collection("market").doc(diagnostic.postId);
  const updates: any = {};

  // 1. currentPeople 수정
  if (diagnostic.issues.some((i) => i.includes("currentPeople 불일치"))) {
    updates.currentPeople = diagnostic.data.actualCount;
    applied.push(`currentPeople를 ${diagnostic.data.actualCount}로 수정`);
  }

  // 2. currentPeople > people 제한
  if (
    diagnostic.data.post.currentPeople &&
    diagnostic.data.post.people &&
    diagnostic.data.post.currentPeople > diagnostic.data.post.people
  ) {
    updates.currentPeople = diagnostic.data.post.people;
    applied.push(
      `currentPeople를 ${diagnostic.data.post.people}로 제한 (마감 초과 방지)`
    );
  }

  // 3. currentPeople = 0 (신청 목록 비어있을 때)
  if (
    diagnostic.issues.some((i) => i.includes("신청 목록이 비어있는데")) &&
    diagnostic.data.joins.length === 0
  ) {
    updates.currentPeople = 0;
    applied.push("currentPeople를 0으로 수정 (신청 목록 비어있음)");
  }

  // 4. status 수정 (마감 상태)
  if (
    diagnostic.warnings.some((w) => w.includes("status가 'done'이 아님")) &&
    diagnostic.data.post.currentPeople >= diagnostic.data.post.people
  ) {
    updates.status = "done";
    applied.push("status를 'done'으로 변경 (마감 상태)");
  }

  // 5. 옛날 필드 제거 (선택적)
  if (diagnostic.warnings.some((w) => w.includes("옛날 필드"))) {
    updates.joined = admin.firestore.FieldValue.delete();
    updates.max = admin.firestore.FieldValue.delete();
    applied.push("옛날 필드(joined, max) 제거");
  }

  // 6. 업데이트 적용
  if (applied.length > 0 && autoFix) {
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await postRef.update(updates);
    logger.info("[applyFixes] 수정 적용 완료:", {
      postId: diagnostic.postId,
      applied,
    });
  } else if (applied.length > 0) {
    logger.info("[applyFixes] 수정 대기 (autoFix=false):", {
      postId: diagnostic.postId,
      applied,
    });
  }

  return applied;
}
