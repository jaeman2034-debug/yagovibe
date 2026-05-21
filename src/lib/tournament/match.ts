/**
 * 🔥 경기 관리
 * 
 * 구조:
 * matches/{matchId}
 * matchResults/{matchId}
 * 
 * 역할:
 * - 경기 생성
 * - 경기 결과 기록 (트랜잭션)
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamStatsAfterMatch } from "./teamStats";

export type MatchStatus = "SCHEDULED" | "LIVE" | "DONE" | "CANCELLED";

export interface Match {
  id: string;
  tournamentId: string;
  roundId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  liveHomeScore?: number;
  liveAwayScore?: number;
  lastUpdatedAt?: any;
  scheduledAt?: any;
  createdAt: any;
}

export interface MatchResult {
  id: string; // matchId와 동일
  matchId: string;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  recordedByUid: string;
  recordedAt: any;
}

/**
 * 경기 생성
 */
export async function createMatch({
  tournamentId,
  roundId,
  homeTeamId,
  awayTeamId,
  scheduledAt,
}: {
  tournamentId: string;
  roundId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt?: Date;
}): Promise<string> {
  if (!tournamentId || !roundId || !homeTeamId || !awayTeamId) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const matchRef = await addDoc(collection(db, "matches"), {
    tournamentId,
    roundId,
    homeTeamId,
    awayTeamId,
    status: "SCHEDULED",
    scheduledAt: scheduledAt || null,
    createdAt: serverTimestamp(),
  });

  return matchRef.id;
}

/**
 * 경기 결과 기록 (트랜잭션)
 */
export async function recordMatchResult({
  matchId,
  homeScore,
  awayScore,
  actorUid,
}: {
  matchId: string;
  homeScore: number;
  awayScore: number;
  actorUid: string;
}): Promise<void> {
  if (!matchId || homeScore == null || awayScore == null || !actorUid) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  if (homeScore < 0 || awayScore < 0) {
    throw new Error("점수는 0 이상이어야 합니다.");
  }

  const matchRef = doc(db, "matches", matchId);
  const resultRef = doc(db, "matchResults", matchId); // matchId를 문서 ID로 사용

  // 경기 정보 미리 조회 (스탯 업데이트용)
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const match = matchSnap.data();
  
  // 이미 기록된 경기 확인
  if (match.status === "DONE") {
    throw new Error("이미 기록된 경기입니다.");
  }

  // LIVE 상태면 liveScore에서 점수 가져오기 (없으면 파라미터 사용)
  const finalHomeScore = match.status === "LIVE" && match.liveHomeScore != null
    ? match.liveHomeScore
    : homeScore;
  const finalAwayScore = match.status === "LIVE" && match.liveAwayScore != null
    ? match.liveAwayScore
    : awayScore;

  // 승자 결정
  const winnerTeamId =
    finalHomeScore === finalAwayScore
      ? null
      : finalHomeScore > finalAwayScore
      ? match.homeTeamId
      : match.awayTeamId;

  await runTransaction(db, async (transaction) => {
    // 1️⃣ 경기 정보 재확인 (트랜잭션 내부)
    const matchSnapTx = await transaction.get(matchRef);
    if (!matchSnapTx.exists()) {
      throw new Error("경기를 찾을 수 없습니다.");
    }

    const matchData = matchSnapTx.data();
    if (matchData.status === "DONE") {
      throw new Error("이미 기록된 경기입니다.");
    }

    // 2️⃣ 결과 기록
    transaction.set(resultRef, {
      matchId,
      homeScore,
      awayScore,
      winnerTeamId,
      recordedByUid: actorUid,
      recordedAt: serverTimestamp(),
    });

    // 3️⃣ 경기 상태 업데이트
    transaction.update(matchRef, {
      status: "DONE",
    });
  });

  // 4️⃣ 팀 스탯 업데이트 (트랜잭션 외부에서 처리 - 성능 최적화)
  try {
    // 홈팀 스탯
    await updateTeamStatsAfterMatch({
      tournamentId: match.tournamentId,
      teamId: match.homeTeamId,
      goalsFor: finalHomeScore,
      goalsAgainst: finalAwayScore,
      isWin: finalHomeScore > finalAwayScore,
      isDraw: finalHomeScore === finalAwayScore,
    });

    // 원정팀 스탯
    await updateTeamStatsAfterMatch({
      tournamentId: match.tournamentId,
      teamId: match.awayTeamId,
      goalsFor: finalAwayScore,
      goalsAgainst: finalHomeScore,
      isWin: finalAwayScore > finalHomeScore,
      isDraw: finalHomeScore === finalAwayScore,
    });
  } catch (statsError) {
    // 스탯 업데이트 실패해도 경기 결과는 기록됨 (로그만 남김)
    console.error("팀 스탯 업데이트 실패:", statsError);
  }
}

/**
 * 라운드의 경기 목록 조회
 */
export async function getRoundMatches(
  roundId: string
): Promise<Match[]> {
  const q = query(
    collection(db, "matches"),
    where("roundId", "==", roundId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];
}

/**
 * 경기 결과 조회
 */
export async function getMatchResult(
  matchId: string
): Promise<MatchResult | null> {
  const resultRef = doc(db, "matchResults", matchId);
  const snap = await getDoc(resultRef);

  if (!snap.exists()) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as MatchResult;
}

/**
 * 라이브 경기 시작
 */
export async function startLive(matchId: string): Promise<void> {
  if (!matchId) {
    throw new Error("BAD_ARGS: matchId가 필요합니다.");
  }

  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const matchData = matchSnap.data();
  if (matchData.status === "DONE") {
    throw new Error("이미 종료된 경기입니다.");
  }

  await updateDoc(matchRef, {
    status: "LIVE",
    liveHomeScore: 0,
    liveAwayScore: 0,
    lastUpdatedAt: serverTimestamp(),
  });
}

/**
 * 라이브 스코어 업데이트
 */
export async function updateLiveScore({
  matchId,
  homeScore,
  awayScore,
}: {
  matchId: string;
  homeScore: number;
  awayScore: number;
}): Promise<void> {
  if (!matchId || homeScore == null || awayScore == null) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  if (homeScore < 0 || awayScore < 0) {
    throw new Error("점수는 0 이상이어야 합니다.");
  }

  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const matchData = matchSnap.data();
  if (matchData.status !== "LIVE") {
    throw new Error("라이브 중인 경기만 점수를 업데이트할 수 있습니다.");
  }

  await updateDoc(matchRef, {
    liveHomeScore: homeScore,
    liveAwayScore: awayScore,
    lastUpdatedAt: serverTimestamp(),
  });
}

/**
 * 라이브 경기 종료 (DONE으로 전환, 결과 확정)
 */
export async function endLive({
  matchId,
  actorUid,
}: {
  matchId: string;
  actorUid: string;
}): Promise<void> {
  if (!matchId || !actorUid) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const matchData = matchSnap.data();
  if (matchData.status !== "LIVE") {
    throw new Error("라이브 중인 경기만 종료할 수 있습니다.");
  }

  // LIVE 점수를 최종 결과로 확정
  const homeScore = matchData.liveHomeScore ?? 0;
  const awayScore = matchData.liveAwayScore ?? 0;

  // recordMatchResult 호출하여 결과 확정 및 스탯 업데이트
  await recordMatchResult({
    matchId,
    homeScore,
    awayScore,
    actorUid,
  });
}

/**
 * 경기 단일 조회 (실시간 구독용)
 */
export async function getMatch(
  matchId: string
): Promise<Match | null> {
  const matchRef = doc(db, "matches", matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    return null;
  }

  return {
    id: matchSnap.id,
    ...matchSnap.data(),
  } as Match;
}
