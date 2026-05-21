/**
 * 🔥 대회 통계 집계 유틸리티 (Stats 최적화)
 * 
 * 승인 팀 수를 매번 쿼리하지 않고 stats 문서에서 O(1)로 조회
 * 
 * Stats 문서 스키마:
 * associations/{associationId}/tournaments/{tournamentId}/stats/teams
 * {
 *   approvedCount: number,  // 기본 0
 *   updatedAt: Timestamp
 * }
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * 🔥 Stats 문서 경로
 */
function getStatsRef(associationId: string, tournamentId: string): admin.firestore.DocumentReference {
  return db.doc(
    `associations/${associationId}/tournaments/${tournamentId}/stats/teams`
  );
}

/**
 * 🔥 Stats 문서 초기화 (없으면 생성)
 */
export async function ensureStatsDocument(
  associationId: string,
  tournamentId: string
): Promise<void> {
  const statsRef = getStatsRef(associationId, tournamentId);
  const statsSnap = await statsRef.get();
  
  if (!statsSnap.exists) {
    await statsRef.set({
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      totalCount: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info("[tournamentStats] ✅ Stats 문서 초기화 완료", {
      associationId,
      tournamentId,
    });
  }
}

/**
 * 🔥 승인 팀 수 조회 (O(1))
 */
export async function getApprovedTeamsCount(
  associationId: string,
  tournamentId: string
): Promise<number> {
  const statsRef = getStatsRef(associationId, tournamentId);
  const statsSnap = await statsRef.get();
  
  if (!statsSnap.exists) {
    // Stats 문서가 없으면 초기화 후 0 반환
    await ensureStatsDocument(associationId, tournamentId);
    return 0;
  }
  
  const statsData = statsSnap.data();
  return Number(statsData?.approvedCount ?? 0);
}

/**
 * 🔥 승인 팀 수 증가 (트랜잭션 내에서 사용)
 */
export function incrementApprovedCount(
  tx: admin.firestore.Transaction,
  associationId: string,
  tournamentId: string
): void {
  const statsRef = getStatsRef(associationId, tournamentId);
  tx.update(statsRef, {
    approvedCount: admin.firestore.FieldValue.increment(1),
    totalCount: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * 🔥 승인 팀 수 감소 (트랜잭션 내에서 사용)
 */
export function decrementApprovedCount(
  tx: admin.firestore.Transaction,
  associationId: string,
  tournamentId: string
): void {
  const statsRef = getStatsRef(associationId, tournamentId);
  tx.update(statsRef, {
    approvedCount: admin.firestore.FieldValue.increment(-1),
    totalCount: admin.firestore.FieldValue.increment(-1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * 🔥 팀 상태 변경 시 approvedCount 증감 (트랜잭션 내에서 사용)
 * 
 * @param tx - Firestore Transaction
 * @param associationId - 협회 ID
 * @param tournamentId - 대회 ID
 * @param prevStatus - 이전 상태 ("APPROVED" | "PENDING" | "REJECTED" | null)
 * @param nextStatus - 다음 상태 ("APPROVED" | "PENDING" | "REJECTED")
 * @param statsSnap - Stats 문서 스냅샷 (트랜잭션 내에서 이미 읽은 경우)
 */
export async function updateApprovedCountOnStatusChange(
  tx: admin.firestore.Transaction,
  associationId: string,
  tournamentId: string,
  prevStatus: string | null | undefined,
  nextStatus: string,
  statsSnap?: admin.firestore.DocumentSnapshot
): Promise<void> {
  const statsRef = getStatsRef(associationId, tournamentId);
  
  const prevApproved = prevStatus === "APPROVED";
  const nextApproved = nextStatus === "APPROVED";
  
  // 상태 변경이 없으면 무시 (멱등)
  if (prevApproved === nextApproved) {
    return;
  }
  
  // delta 계산: APPROVED가 되면 +1, APPROVED에서 벗어나면 -1
  const delta = nextApproved ? 1 : -1;
  
  // Stats 문서 읽기 (트랜잭션 내에서, 이미 읽지 않았다면)
  const finalStatsSnap = statsSnap || await tx.get(statsRef);
  
  // Stats 문서가 없으면 초기화
  if (!finalStatsSnap.exists) {
    tx.set(statsRef, {
      approvedCount: Math.max(0, delta),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // increment 사용 (원자적 연산)
    // 음수 방지: 현재 값이 0이고 delta가 -1이면 업데이트하지 않음
    const currentCount = Number(finalStatsSnap.data()?.approvedCount ?? 0);
    if (currentCount === 0 && delta < 0) {
      // 음수 방지: 이미 0이면 감소하지 않음
      return;
    }
    
    tx.update(statsRef, {
      approvedCount: admin.firestore.FieldValue.increment(delta),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}


/**
 * 🔥 Stats 문서 동기화 (마이그레이션용 - 실제 팀 수와 동기화)
 */
export async function syncStatsFromTeams(
  associationId: string,
  tournamentId: string
): Promise<{ approvedCount: number; pendingCount: number; rejectedCount: number }> {
  const teamsRef = db.collection(
    `associations/${associationId}/tournaments/${tournamentId}/teams`
  );
  
  const [approvedSnap, pendingSnap, rejectedSnap] = await Promise.all([
    teamsRef.where("status", "==", "APPROVED").get(),
    teamsRef.where("status", "==", "PENDING").get(),
    teamsRef.where("status", "==", "REJECTED").get(),
  ]);
  
  const approvedCount = approvedSnap.size;
  const pendingCount = pendingSnap.size;
  const rejectedCount = rejectedSnap.size;
  const totalCount = approvedCount + pendingCount + rejectedCount;
  
  const statsRef = getStatsRef(associationId, tournamentId);
  await statsRef.set({
    approvedCount,
    pendingCount,
    rejectedCount,
    totalCount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  
  logger.info("[tournamentStats] ✅ Stats 동기화 완료", {
    associationId,
    tournamentId,
    approvedCount,
    pendingCount,
    rejectedCount,
    totalCount,
  });
  
  return { approvedCount, pendingCount, rejectedCount };
}
