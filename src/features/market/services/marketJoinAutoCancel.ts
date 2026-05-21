/**
 * 🔥 매칭 참여 자동 취소 시스템 (운영 안정화)
 * 
 * 역할:
 * - 무응답 참여 신청 자동 거절
 * - 승인 취소 처리
 * - 로깅 시스템
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  Timestamp,
  runTransaction
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost } from "../types";

/**
 * 자동 거절 설정 (기본값: 10분)
 */
const AUTO_REJECT_TIMEOUT_MINUTES = 10;

/**
 * 무응답 참여 신청 자동 거절
 * 
 * @param postId - 게시글 ID
 * @param timeoutMinutes - 타임아웃 시간 (분, 기본값: 10분)
 */
export async function autoRejectPendingJoins(
  postId: string,
  timeoutMinutes: number = AUTO_REJECT_TIMEOUT_MINUTES
): Promise<{
  rejected: number;
  rejectedIds: string[];
}> {
  console.log("🔥 [autoRejectPendingJoins] 시작:", {
    postId,
    timeoutMinutes,
  });

  const now = Timestamp.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const timeoutTimestamp = Timestamp.fromMillis(now.toMillis() - timeoutMs);

  // 🔥 무응답 참여 신청 조회
  const pendingQuery = query(
    collection(db, "marketJoins"),
    where("postId", "==", postId),
    where("status", "==", "pending")
  );

  const pendingSnap = await getDocs(pendingQuery);
  const expiredJoins = pendingSnap.docs.filter((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt;
    
    if (!createdAt) return false;
    
    // 🔥 타임스탬프 비교
    const createdAtTimestamp = createdAt instanceof Timestamp 
      ? createdAt 
      : Timestamp.fromDate(new Date(createdAt));
    
    return createdAtTimestamp.toMillis() < timeoutTimestamp.toMillis();
  });

  console.log("📋 [autoRejectPendingJoins] 만료된 신청:", {
    total: pendingSnap.size,
    expired: expiredJoins.length,
  });

  if (expiredJoins.length === 0) {
    return { rejected: 0, rejectedIds: [] };
  }

  // 🔥 게시글 조회 (인원수 감소용)
  const postRef = doc(db, "market", postId);
  const { getDoc } = await import("firebase/firestore");
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    console.warn("⚠️ [autoRejectPendingJoins] 게시글 없음:", postId);
    return { rejected: 0, rejectedIds: [] };
  }

  const post = postSnap.data() as MarketPost;

  // 🔥 트랜잭션으로 일괄 거절 처리
  const rejectedIds: string[] = [];
  let rejectedCount = 0;

  for (const joinDoc of expiredJoins) {
    try {
      await runTransaction(db, async (transaction) => {
        const joinRef = doc(db, "marketJoins", joinDoc.id);
        const joinSnap = await transaction.get(joinRef);

        if (!joinSnap.exists()) {
          return; // 이미 삭제됨
        }

        const joinData = joinSnap.data();
        
        // 🔥 상태 재확인 (트랜잭션 내부에서)
        if (joinData.status !== "pending") {
          return; // 이미 처리됨
        }

        // 🔥 자동 거절 처리
        transaction.update(joinRef, {
          status: "rejected",
          updatedAt: serverTimestamp(),
          rejectedReason: "AUTO_TIMEOUT",
          rejectedAt: serverTimestamp(),
        });

        // 🔥 게시글 재조회 (트랜잭션 내부에서 최신 상태 확인)
        const postSnapInTx = await transaction.get(postRef);
        if (!postSnapInTx.exists()) {
          return; // 게시글 삭제됨
        }

        const postInTx = postSnapInTx.data() as MarketPost;
        const currentPeopleInTx = postInTx.currentPeople || 0;

        // 🔥 인원수 감소
        const newCurrentPeople = Math.max(0, currentPeopleInTx - 1);
        transaction.update(postRef, {
          currentPeople: newCurrentPeople,
        });
      });

      rejectedIds.push(joinDoc.id);
      rejectedCount++;

      console.log("✅ [autoRejectPendingJoins] 자동 거절 완료:", {
        joinId: joinDoc.id,
        userId: joinDoc.data().userId,
      });
    } catch (error: any) {
      console.error("❌ [autoRejectPendingJoins] 자동 거절 실패:", {
        joinId: joinDoc.id,
        error: error.message,
      });
    }
  }

  console.log("✅ [autoRejectPendingJoins] 완료:", {
    rejected: rejectedCount,
    rejectedIds,
  });

  return {
    rejected: rejectedCount,
    rejectedIds,
  };
}

/**
 * 승인 취소 처리 (승인된 참여 신청 취소)
 * 
 * @param joinId - 참여 신청 ID
 * @param postId - 게시글 ID
 * @param userId - 사용자 ID
 */
export async function cancelApprovedJoin(
  joinId: string,
  postId: string,
  userId: string
): Promise<void> {
  console.log("🔥 [cancelApprovedJoin] 시작:", {
    joinId,
    postId,
    userId,
  });

  return await runTransaction(db, async (transaction) => {
    const joinRef = doc(db, "marketJoins", joinId);
    const joinSnap = await transaction.get(joinRef);

    if (!joinSnap.exists()) {
      throw new Error("참여 신청을 찾을 수 없습니다.");
    }

    const joinData = joinSnap.data();
    
    // 🔥 승인된 상태만 취소 가능
    if (joinData.status !== "approved") {
      throw new Error("승인된 참여 신청만 취소할 수 있습니다.");
    }

    // 🔥 본인 또는 작성자만 취소 가능
    const postRef = doc(db, "market", postId);
    const postSnap = await transaction.get(postRef);
    
    if (!postSnap.exists()) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }
    
    const post = postSnap.data() as MarketPost;
    const isAuthor = post.authorId === userId;
    const isParticipant = joinData.userId === userId;
    
    if (!isAuthor && !isParticipant) {
      throw new Error("본인 또는 작성자만 취소할 수 있습니다.");
    }

    const beforeCurrentPeople = post.currentPeople || 0;

    // 🔥 참여 신청 상태 변경 (작성자 취소 vs 참여자 취소 구분)
    const cancelStatus = isAuthor ? "cancelled_by_author" : "cancelled_by_user";
    
    transaction.update(joinRef, {
      status: cancelStatus,
      updatedAt: serverTimestamp(),
      cancelledAt: serverTimestamp(),
    });

    // 🔥 인원수 감소
    const newCurrentPeople = Math.max(0, beforeCurrentPeople - 1);
    transaction.update(postRef, {
      currentPeople: newCurrentPeople,
    });

    console.log("✅ [cancelApprovedJoin] 취소 완료:", {
      joinId,
      beforeCurrentPeople,
      afterCurrentPeople: newCurrentPeople,
    });
  });
}
