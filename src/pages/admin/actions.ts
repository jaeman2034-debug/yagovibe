/**
 * 🔥 관리자 명령 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 강제 승인
 * - 강제 롤백
 * - 트랜잭션으로 안전하게 처리
 */

import { db } from "@/lib/firebase";
import { doc, runTransaction, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * 강제 승인 (관리자 전용)
 * 
 * @param postId - 게시글 ID
 * @param userId - 사용자 ID
 */
export async function forcePromote(postId: string, userId: string): Promise<void> {
  const joinId = `${postId}_${userId}`;

  await runTransaction(db, async (tx) => {
    const joinRef = doc(db, "marketJoins", joinId);
    const postRef = doc(db, "market", postId);

    const joinSnap = await tx.get(joinRef);
    const postSnap = await tx.get(postRef);

    if (!joinSnap.exists()) {
      throw new Error("참여 신청을 찾을 수 없습니다.");
    }

    if (!postSnap.exists()) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    const joinData = joinSnap.data();
    const post = postSnap.data() as any;

    // 🔥 pending 상태만 승인 가능
    if (joinData.status !== "pending") {
      throw new Error("pending 상태만 승인할 수 있습니다.");
    }

    const maxPeople = typeof post.people === "number" ? post.people : 0;
    const currentPeople = typeof post.currentPeople === "number" ? post.currentPeople : 0;

    // 🔥 승인 처리
    tx.update(joinRef, {
      status: "approved",
      updatedAt: serverTimestamp(),
      promotedAt: serverTimestamp(),
      promotedFrom: "admin_force",
    });

    // 🔥 인원 증가
    const newCurrentPeople = currentPeople + 1;
    const isFull = maxPeople > 0 ? newCurrentPeople >= maxPeople : false;
    const status = isFull ? "full" : "open";

    tx.update(postRef, {
      currentPeople: newCurrentPeople,
      status,
      ...(typeof post.isFull === "boolean" && { isFull }),
      updatedAt: serverTimestamp(),
    });
  });

  console.log("✅ [forcePromote] 강제 승인 완료:", { postId, userId });
}

/**
 * 강제 롤백 (관리자 전용)
 * 
 * @param postId - 게시글 ID
 * @param userId - 사용자 ID
 */
export async function forceRollback(postId: string, userId: string): Promise<void> {
  const joinId = `${postId}_${userId}`;

  await runTransaction(db, async (tx) => {
    const joinRef = doc(db, "marketJoins", joinId);
    const postRef = doc(db, "market", postId);

    const joinSnap = await tx.get(joinRef);
    const postSnap = await tx.get(postRef);

    if (!joinSnap.exists()) {
      throw new Error("참여 신청을 찾을 수 없습니다.");
    }

    if (!postSnap.exists()) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    const joinData = joinSnap.data();
    const post = postSnap.data() as any;

    // 🔥 approved 상태만 롤백 가능
    if (joinData.status !== "approved") {
      throw new Error("approved 상태만 롤백할 수 있습니다.");
    }

    const currentPeople = typeof post.currentPeople === "number" ? post.currentPeople : 0;

    // 🔥 거절 처리
    tx.update(joinRef, {
      status: "rejected",
      updatedAt: serverTimestamp(),
      rejectedAt: serverTimestamp(),
      rejectedReason: "ADMIN_ROLLBACK",
    });

    // 🔥 인원 감소
    const newCurrentPeople = Math.max(0, currentPeople - 1);
    const status = "open";

    tx.update(postRef, {
      currentPeople: newCurrentPeople,
      status,
      ...(typeof post.isFull === "boolean" && { isFull: false }),
      updatedAt: serverTimestamp(),
    });
  });

  console.log("✅ [forceRollback] 강제 롤백 완료:", { postId, userId });
}
