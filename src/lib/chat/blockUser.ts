/**
 * 🔥 사용자 차단 함수
 * 
 * 역할:
 * - 특정 사용자 차단
 * - 차단 정보 저장
 * - Trade/Recruit 공통
 */

import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface BlockUserParams {
  myUid: string;
  targetUid: string;
  reason?: string;
}

/**
 * 사용자 차단
 */
export async function blockUser(params: BlockUserParams): Promise<void> {
  const { myUid, targetUid, reason } = params;

  if (!myUid || !targetUid) {
    throw new Error("사용자 ID가 필요합니다.");
  }

  if (myUid === targetUid) {
    throw new Error("자기 자신을 차단할 수 없습니다.");
  }

  try {
    const blockRef = doc(db, "blocks", myUid);
    const blockSnap = await getDoc(blockRef);

    const currentBlocks = blockSnap.data()?.blocked || {};

    await setDoc(
      blockRef,
      {
        blocked: {
          ...currentBlocks,
          [targetUid]: {
            at: serverTimestamp(),
            reason: reason || null,
          },
        },
      },
      { merge: true }
    );
  } catch (error) {
    console.error("❌ [blockUser] 차단 실패:", error);
    throw error;
  }
}

/**
 * 사용자 차단 해제
 */
export async function unblockUser(myUid: string, targetUid: string): Promise<void> {
  if (!myUid || !targetUid) {
    throw new Error("사용자 ID가 필요합니다.");
  }

  try {
    const blockRef = doc(db, "blocks", myUid);
    const blockSnap = await getDoc(blockRef);

    const currentBlocks = blockSnap.data()?.blocked || {};
    const { [targetUid]: _, ...restBlocks } = currentBlocks;

    await setDoc(
      blockRef,
      {
        blocked: restBlocks,
      },
      { merge: true }
    );
  } catch (error) {
    console.error("❌ [unblockUser] 차단 해제 실패:", error);
    throw error;
  }
}

/**
 * 차단 여부 확인
 */
export async function isBlocked(myUid: string, targetUid: string): Promise<boolean> {
  if (!myUid || !targetUid) {
    return false;
  }

  try {
    const blockRef = doc(db, "blocks", myUid);
    const blockSnap = await getDoc(blockRef);
    const blocks = blockSnap.data()?.blocked || {};
    return !!blocks[targetUid];
  } catch (error) {
    console.error("❌ [isBlocked] 확인 실패:", error);
    return false;
  }
}
