/**
 * 🔥 Usage Helper - Usage 업데이트 헬퍼
 * 
 * 트랜잭션 내에서 사용
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { TeamUsage } from "../types/usage";

const db = getFirestore();

/**
 * Usage 문서 가져오기 (트랜잭션 없이)
 */
export async function getTeamUsage(teamId: string): Promise<TeamUsage> {
  const usageRef = db.doc(`teams/${teamId}/usage/current`);
  const usageSnap = await usageRef.get();

  if (!usageSnap.exists) {
    // 기본값 반환
    return {
      membersCount: 0,
      actionsThisMonth: 0,
      storageMB: 0,
      updatedAt: FieldValue.serverTimestamp(),
    };
  }

  const data = usageSnap.data()!;
  return {
    membersCount: data.membersCount || 0,
    actionsThisMonth: data.actionsThisMonth || 0,
    storageMB: data.storageMB || 0,
    updatedAt: data.updatedAt,
  };
}

/**
 * Usage 문서 가져오기 또는 생성 (트랜잭션 내에서)
 */
export async function getOrCreateUsageRef(
  transaction: any,
  teamId: string
): Promise<FirebaseFirestore.DocumentReference> {
  const usageRef = db.doc(`teams/${teamId}/usage/current`);
  const usageSnap = await transaction.get(usageRef);

  if (!usageSnap.exists) {
    // Usage 문서가 없으면 초기화
    transaction.set(usageRef, {
      membersCount: 0,
      actionsThisMonth: 0,
      storageMB: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return usageRef;
}

/**
 * 멤버 수 업데이트 (트랜잭션 내에서)
 */
export async function updateMembersCount(
  transaction: any,
  teamId: string
): Promise<void> {
  const membersRef = db.collection(`teams/${teamId}/members`);
  const membersSnapshot = await transaction.get(membersRef);
  
  const activeCount = membersSnapshot.docs.filter(
    (doc: any) => doc.data().status === "active"
  ).length;

  const usageRef = await getOrCreateUsageRef(transaction, teamId);
  transaction.update(usageRef, {
    membersCount: activeCount,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 액션 수 증가 (트랜잭션 내에서)
 */
export async function incrementActionCount(
  transaction: any,
  teamId: string,
  count: number = 1
): Promise<void> {
  const usageRef = await getOrCreateUsageRef(transaction, teamId);
  transaction.update(usageRef, {
    actionsThisMonth: FieldValue.increment(count),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 저장 용량 증가 (트랜잭션 내에서)
 */
export async function incrementStorage(
  transaction: any,
  teamId: string,
  mb: number
): Promise<void> {
  const usageRef = await getOrCreateUsageRef(transaction, teamId);
  transaction.update(usageRef, {
    storageMB: FieldValue.increment(mb),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
