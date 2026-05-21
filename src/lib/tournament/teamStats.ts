/**
 * 🔥 팀 스탯 관리
 * 
 * 구조:
 * teamStats/{tournamentId}_{teamId}
 * 
 * 역할:
 * - 경기 결과 기록 시 스탯 자동 업데이트
 * - 랭킹 계산 (승점, 득실차, 다득점)
 */

import {
  doc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { collection } from "firebase/firestore";

export interface TeamStats {
  id: string; // {tournamentId}_{teamId}
  tournamentId: string;
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  updatedAt: any;
}

/**
 * 팀 스탯 조회 (없으면 기본값 반환)
 */
export async function getTeamStats(
  tournamentId: string,
  teamId: string
): Promise<TeamStats | null> {
  const statsRef = doc(db, "teamStats", `${tournamentId}_${teamId}`);
  const snap = await getDoc(statsRef);

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as TeamStats;
}

/**
 * 팀 스탯 업데이트 (경기 결과 반영)
 */
export async function updateTeamStatsAfterMatch({
  tournamentId,
  teamId,
  goalsFor,
  goalsAgainst,
  isWin,
  isDraw,
}: {
  tournamentId: string;
  teamId: string;
  goalsFor: number;
  goalsAgainst: number;
  isWin: boolean;
  isDraw: boolean;
}): Promise<void> {
  const statsRef = doc(db, "teamStats", `${tournamentId}_${teamId}`);
  const statsSnap = await getDoc(statsRef);

  const currentStats = statsSnap.exists()
    ? (statsSnap.data() as TeamStats)
    : {
        id: `${tournamentId}_${teamId}`,
        tournamentId,
        teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
        updatedAt: serverTimestamp(),
      };

  // 스탯 계산
  const newPlayed = currentStats.played + 1;
  const newGoalsFor = currentStats.goalsFor + goalsFor;
  const newGoalsAgainst = currentStats.goalsAgainst + goalsAgainst;
  const newGoalDiff = newGoalsFor - newGoalsAgainst;

  let newWins = currentStats.wins;
  let newDraws = currentStats.draws;
  let newLosses = currentStats.losses;

  if (isWin) {
    newWins += 1;
  } else if (isDraw) {
    newDraws += 1;
  } else {
    newLosses += 1;
  }

  const newPoints = newWins * 3 + newDraws * 1;

  // 업데이트
  await statsSnap.ref.set(
    {
      tournamentId,
      teamId,
      played: newPlayed,
      wins: newWins,
      draws: newDraws,
      losses: newLosses,
      goalsFor: newGoalsFor,
      goalsAgainst: newGoalsAgainst,
      goalDiff: newGoalDiff,
      points: newPoints,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * 대회별 팀 스탯 목록 조회 (랭킹 정렬)
 */
export async function getTournamentStandings(
  tournamentId: string
): Promise<TeamStats[]> {
  const q = query(
    collection(db, "teamStats"),
    where("tournamentId", "==", tournamentId),
    orderBy("points", "desc"),
    orderBy("goalDiff", "desc"),
    orderBy("goalsFor", "desc")
  );

  const snap = await getDocs(q);
  const standings = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TeamStats[];

  // 정렬 규칙 적용 (Firestore 쿼리 제한으로 인해 클라이언트에서 재정렬)
  standings.sort((a, b) => {
    // 1순위: 승점 (내림차순)
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // 2순위: 득실차 (내림차순)
    if (b.goalDiff !== a.goalDiff) {
      return b.goalDiff - a.goalDiff;
    }
    // 3순위: 다득점 (내림차순)
    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }
    // 4순위: 경기 수 (적은 팀 우선, 오름차순)
    return a.played - b.played;
  });

  return standings;
}
