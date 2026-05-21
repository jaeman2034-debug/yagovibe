/**
 * 🔥 매칭 참여 무결성 감시 시스템 (운영 안정화)
 * 
 * 역할:
 * - currentPeople과 실제 승인 수 일치 여부 확인
 * - 불일치 감지 시 자동 보정
 * - 관리자 대시보드 연동
 */

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost } from "../types";

export interface IntegrityCheckResult {
  postId: string;
  currentPeople: number;
  realApproved: number;
  isSafe: boolean;
  pendingCount: number;
  rejectedCount: number;
  cancelledCount: number;
  discrepancies: {
    type: "OVERCOUNT" | "UNDERCOUNT" | "NONE";
    difference: number;
  };
}

/**
 * 게시글 무결성 체크
 * 
 * @param postId - 게시글 ID
 * @returns 무결성 체크 결과
 */
export async function checkMarketIntegrity(
  postId: string
): Promise<IntegrityCheckResult> {
  console.log("🔍 [checkMarketIntegrity] 시작:", { postId });

  // 🔥 게시글 조회
  const postRef = doc(db, "market", postId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) {
    throw new Error("게시글을 찾을 수 없습니다.");
  }

  const post = postSnap.data() as MarketPost;
  const currentPeople = post.currentPeople || 0;

  // 🔥 참여 신청 전체 조회
  const joinsQuery = query(
    collection(db, "marketJoins"),
    where("postId", "==", postId)
  );
  const joinsSnap = await getDocs(joinsQuery);

  const joins = joinsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // 🔥 상태별 카운트
  const realApproved = joins.filter((j) => j.status === "approved").length;
  const pendingCount = joins.filter((j) => j.status === "pending").length;
  const rejectedCount = joins.filter((j) => j.status === "rejected").length;
  const cancelledCount = joins.filter(
    (j) => j.status === "cancelled"
  ).length;

  // 🔥 무결성 검증
  const difference = currentPeople - realApproved;
  const isSafe = difference === 0;

  let discrepancyType: "OVERCOUNT" | "UNDERCOUNT" | "NONE" = "NONE";
  if (difference > 0) {
    discrepancyType = "OVERCOUNT"; // currentPeople이 더 큼 (과다 카운트)
  } else if (difference < 0) {
    discrepancyType = "UNDERCOUNT"; // currentPeople이 더 작음 (부족 카운트)
  }

  const result: IntegrityCheckResult = {
    postId,
    currentPeople,
    realApproved,
    isSafe,
    pendingCount,
    rejectedCount,
    cancelledCount,
    discrepancies: {
      type: discrepancyType,
      difference: Math.abs(difference),
    },
  };

  console.log("📊 [checkMarketIntegrity] 결과:", result);

  return result;
}

/**
 * 무결성 자동 보정
 * 
 * @param postId - 게시글 ID
 * @returns 보정 결과
 */
export async function fixMarketIntegrity(
  postId: string
): Promise<{
  fixed: boolean;
  before: number;
  after: number;
  message: string;
}> {
  console.log("🔧 [fixMarketIntegrity] 시작:", { postId });

  // 🔥 무결성 체크
  const checkResult = await checkMarketIntegrity(postId);

  if (checkResult.isSafe) {
    console.log("✅ [fixMarketIntegrity] 무결성 정상, 보정 불필요");
    return {
      fixed: false,
      before: checkResult.currentPeople,
      after: checkResult.currentPeople,
      message: "무결성이 정상입니다. 보정이 필요하지 않습니다.",
    };
  }

  // 🔥 트랜잭션으로 안전하게 보정
  return await runTransaction(db, async (transaction) => {
    const postRef = doc(db, "market", postId);
    const postSnap = await transaction.get(postRef);

    if (!postSnap.exists()) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    // 🔥 실제 승인 수 재확인 (트랜잭션 내부에서)
    const joinsQuery = query(
      collection(db, "marketJoins"),
      where("postId", "==", postId),
      where("status", "==", "approved")
    );
    const joinsSnap = await getDocs(joinsQuery);
    const realApproved = joinsSnap.size;

    const before = postSnap.data().currentPeople || 0;
    const after = realApproved;

    // 🔥 currentPeople을 실제 승인 수로 보정
    transaction.update(postRef, {
      currentPeople: after,
      integrityFixedAt: serverTimestamp(),
      integrityFixedFrom: before,
    });

    console.log("✅ [fixMarketIntegrity] 보정 완료:", {
      postId,
      before,
      after,
    });

    return {
      fixed: true,
      before,
      after,
      message: `무결성 보정 완료: ${before} → ${after}`,
    };
  });
}

/**
 * 모든 게시글 무결성 일괄 체크 (관리자용)
 * 
 * @param limit - 최대 조회 개수 (기본값: 100)
 * @returns 무결성 체크 결과 목록
 */
export async function checkAllMarketIntegrity(
  limit: number = 100
): Promise<{
  total: number;
  safe: number;
  unsafe: number;
  results: IntegrityCheckResult[];
}> {
  console.log("🔍 [checkAllMarketIntegrity] 시작:", { limit });

  // 🔥 모든 게시글 조회
  const marketQuery = query(collection(db, "market"));
  const marketSnap = await getDocs(marketQuery);

  const postIds = marketSnap.docs
    .slice(0, limit)
    .map((doc) => doc.id);

  // 🔥 각 게시글 무결성 체크
  const results = await Promise.all(
    postIds.map((postId) => checkMarketIntegrity(postId).catch((error) => {
      console.error(`❌ [checkAllMarketIntegrity] ${postId} 체크 실패:`, error);
      return null;
    }))
  );

  const validResults = results.filter(
    (r): r is IntegrityCheckResult => r !== null
  );

  const safe = validResults.filter((r) => r.isSafe).length;
  const unsafe = validResults.length - safe;

  console.log("📊 [checkAllMarketIntegrity] 완료:", {
    total: validResults.length,
    safe,
    unsafe,
  });

  return {
    total: validResults.length,
    safe,
    unsafe,
    results: validResults,
  };
}
