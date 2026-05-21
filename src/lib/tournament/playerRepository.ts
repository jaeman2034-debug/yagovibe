/**
 * 🔥 대회 선수 명단 저장/조회 Repository
 * 
 * 연령 검증 결과를 Firestore에 저장하고, 사무국 승인 플로우와 연결
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  writeBatch,
  Timestamp,
  type Firestore
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ClassifiedRow } from "@/utils/rosterAge";

/**
 * 선수 승인 상태
 */
export type ApprovalStatus = "pending" | "approved" | "rejected";

/**
 * @deprecated status 대신 approvalStatus 사용
 */
export type PlayerStatus = ApprovalStatus;

/**
 * 검수 상태 (커서 지시문 3️⃣)
 * - pending: 검수중 (기본값)
 * - approved: 승인
 * - rejected: 반려
 */
export type ReviewStatus = "pending" | "approved" | "rejected";

/**
 * Firestore에 저장되는 선수 정보
 */
export interface TournamentPlayerRecord {
  id: string; // 문서 ID (자동 생성 또는 name+birthYear 기반)
  tournamentId: string;
  associationId: string;
  teamId: string;
  teamName: string;
  
  // 선수 기본 정보
  name: string;
  birthDateRaw: string; // 원문
  birthDateISO?: string | null; // 정규화된 생년월일 (YYYY-MM-DD)
  birthYear?: number | null;
  position?: string | null;
  phone?: string | null;
  jerseyNo?: string | null;
  memo?: string | null;
  
  // 🔥 자동 판별 결과 (절대 수정하지 않음)
  ageCheck: {
    eligible: boolean | null;
    reason: "OK" | "AGE_OVER" | "AGE_UNDER" | "BIRTH_MISSING" | "BIRTH_INVALID" | "RULE_MISSING";
  };
  
  // 🔐 행정 상태 (커서 지시문 3️⃣)
  approvalStatus: ApprovalStatus;
  approvedByUid?: string | null; // 관리자 UID
  approvedAt?: Timestamp | null;
  rejectionReason?: string | null; // 반려 사유 (반려 시 필수)
  
  // 🔥 출전 자격 (커서 지시문 4️⃣)
  // 승인된 선수만 true, 미승인/반려는 false
  eligibleForMatch: boolean;
  
  // 🔥 승인 로그 (커서 지시문 5️⃣)
  approvalLog?: Array<{
    action: "approved" | "rejected" | "pending";
    byUid: string;
    byName?: string;
    at: Timestamp;
    reason?: string;
  }>;
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUid: string; // 등록한 사용자 UID
}

/**
 * 선수 ID 생성 (중복 방지용)
 */
function generatePlayerId(player: ClassifiedRow, index: number): string {
  const namePart = player.name.replace(/\s/g, "");
  const yearPart = player.birthYear?.toString() || "unknown";
  const indexPart = index.toString().padStart(3, "0");
  return `${namePart}_${yearPart}_${indexPart}`;
}

/**
 * 연령 검증 결과를 Firestore에 저장 (Cloud Function 호출)
 * 
 * @param associationId 협회 ID
 * @param tournamentId 대회 ID
 * @param players 검증된 선수 목록
 * @param teamId 팀 ID
 * @param teamName 팀명
 */
export async function saveVerifiedPlayers(
  associationId: string,
  tournamentId: string,
  players: ClassifiedRow[],
  options: {
    teamId: string;
    teamName: string;
  }
): Promise<{ saved: number }> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const functions = getFunctions();
  const importFn = httpsCallable(functions, "importPlayersFromRoster");

  const result = await importFn({
    assocId: associationId,
    tournamentId,
    teamId: options.teamId,
    teamName: options.teamName,
    players: players.map(p => ({
      name: p.name,
      birthDateRaw: p.birthDateRaw,
      birthDateISO: p.birthDateISO,
      birthYear: p.birthYear,
      position: p.position,
      phone: p.phone,
      jerseyNo: p.jerseyNo,
      memo: p.memo,
      ageCheck: p.ageCheck,
    })),
  });

  return {
    saved: (result.data as any)?.count || players.length,
  };
}

/**
 * 대회의 선수 목록 조회 (필터 가능)
 */
export async function getTournamentPlayers(
  associationId: string,
  tournamentId: string,
  filters?: {
    approvalStatus?: ApprovalStatus | ApprovalStatus[];
    eligible?: boolean | null; // ageCheck.eligible 필터
    teamId?: string;
  }
): Promise<TournamentPlayerRecord[]> {
  const playersRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/players`
  );
  
  let q = query(playersRef);
  
  if (filters?.approvalStatus) {
    if (Array.isArray(filters.approvalStatus)) {
      // 여러 상태 필터링은 클라이언트에서 처리 (Firestore 제한)
      // 일단 첫 번째 상태만 필터링
      q = query(playersRef, where("approvalStatus", "==", filters.approvalStatus[0]));
    } else {
      q = query(playersRef, where("approvalStatus", "==", filters.approvalStatus));
    }
  }
  
  if (filters?.teamId) {
    q = query(playersRef, where("teamId", "==", filters.teamId));
  }
  
  const snapshot = await getDocs(q);
  let players = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as TournamentPlayerRecord));
  
  // 정렬: 팀명 → 이름 순
  players.sort((a, b) => {
    const teamCompare = (a.teamName || "").localeCompare(b.teamName || "", "ko");
    if (teamCompare !== 0) return teamCompare;
    return (a.name || "").localeCompare(b.name || "", "ko");
  });
  
  // 여러 상태 필터링이 필요한 경우 클라이언트에서 필터링
  if (filters?.approvalStatus && Array.isArray(filters.approvalStatus) && filters.approvalStatus.length > 1) {
    players = players.filter(p => filters.approvalStatus!.includes(p.approvalStatus));
  }
  
  // eligible 필터 (ageCheck.eligible)
  if (filters?.eligible !== undefined) {
    players = players.filter(p => p.ageCheck.eligible === filters.eligible);
  }
  
  return players;
}

/**
 * 선수 승인 (Cloud Function 호출)
 */
export async function approvePlayers(
  associationId: string,
  tournamentId: string,
  playerIds: string[]
): Promise<{ approved: number }> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const functions = getFunctions();
  const approveFn = httpsCallable(functions, "batchApprovePlayersCallable");

  const result = await approveFn({
    associationId,
    tournamentId,
    playerIds,
  });

  return {
    approved: (result.data as any)?.approvedCount || playerIds.length,
  };
}

/**
 * 선수 반려 (Cloud Function 호출)
 * 
 * 커서 지시문 3️⃣: 반려 시 사유 필수
 */
export async function rejectPlayers(
  associationId: string,
  tournamentId: string,
  playerIds: string[],
  reason: string
): Promise<{ rejected: number }> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const functions = getFunctions();
  const rejectFn = httpsCallable(functions, "batchRejectPlayersCallable");

  const result = await rejectFn({
    associationId,
    tournamentId,
    playerIds,
    reason,
  });

  return {
    rejected: (result.data as any)?.rejectedCount || playerIds.length,
  };
}

