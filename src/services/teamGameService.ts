/**
 * 🔥 팀 경기 서비스
 * 
 * 역할:
 * - 경기 생성
 * - 경기 수정
 * - 경기 완료 처리
 * - 경기 취소
 * - 경기 목록 조회
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamGame, TeamGamePlayParticipation, TeamGamePlayParticipationEntry } from "@/types/teamGame";
import { enqueuePlayFeedbackPrompt } from "@/utils/playFeedbackPromptStorage";

/**
 * 경기 생성
 */
export async function createTeamGame(input: {
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  location?: string;
  address?: string;
  gameType?: "friendly" | "league" | "tournament" | "scrimmage";
  sourceType?: "manual" | "match" | "tournament";
  sourceId?: string | null;
  createdBy: string;
  notes?: string;
}): Promise<string> {
  // 팀 정보 조회 (denormalized)
  const [homeTeamDoc, awayTeamDoc] = await Promise.all([
    getDoc(doc(db, "teams", input.homeTeamId)),
    getDoc(doc(db, "teams", input.awayTeamId)),
  ]);

  if (!homeTeamDoc.exists() || !awayTeamDoc.exists()) {
    throw new Error("팀을 찾을 수 없습니다.");
  }

  const homeTeamData = homeTeamDoc.data();
  const awayTeamData = awayTeamDoc.data();

  // 같은 팀끼리 경기 불가
  if (input.homeTeamId === input.awayTeamId) {
    throw new Error("같은 팀끼리는 경기를 생성할 수 없습니다.");
  }

  const gameData: Omit<TeamGame, "id"> = {
    sportType: homeTeamData.sportType || "football",
    gameType: input.gameType || "friendly",
    sourceType: input.sourceType || "manual",
    sourceId: input.sourceId || null,
    homeTeamId: input.homeTeamId,
    homeTeamName: homeTeamData.name,
    awayTeamId: input.awayTeamId,
    awayTeamName: awayTeamData.name,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    location: input.location || null,
    address: input.address || null,
    status: "scheduled",
    createdBy: input.createdBy,
    notes: input.notes || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const gameRef = await addDoc(collection(db, "team_games"), gameData);

  return gameRef.id;
}

/**
 * 경기 결과 기록 (완료 처리)
 */
export async function completeTeamGame(
  gameId: string,
  result: {
    homeScore: number;
    awayScore: number;
    playedAt?: Date;
    recordedBy: string;
  }
): Promise<void> {
  const gameRef = doc(db, "team_games", gameId);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const gameData = gameDoc.data() as TeamGame;
  const { status, homeTeamId, awayTeamId } = gameData;

  if (status === "completed") {
    throw new Error("이미 기록된 경기입니다.");
  }

  // 승리 팀 결정
  let winnerTeamId: string | null = null;
  let resultType: "home-win" | "away-win" | "draw" | null = null;

  if (result.homeScore > result.awayScore) {
    winnerTeamId = homeTeamId;
    resultType = "home-win";
  } else if (result.homeScore < result.awayScore) {
    winnerTeamId = awayTeamId;
    resultType = "away-win";
  } else {
    resultType = "draw";
  }

  await updateDoc(gameRef, {
    status: "completed",
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    winnerTeamId,
    resultType,
    playedAt: result.playedAt ? Timestamp.fromDate(result.playedAt) : serverTimestamp(),
    recordedBy: result.recordedBy,
    recordedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  enqueuePlayFeedbackPrompt(homeTeamId, gameId);
  enqueuePlayFeedbackPrompt(awayTeamId, gameId);

  // Cloud Function이 자동으로 stats 업데이트
}

/**
 * 경기 취소
 */
export async function cancelTeamGame(
  gameId: string,
  reason?: string
): Promise<void> {
  const gameRef = doc(db, "team_games", gameId);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  await updateDoc(gameRef, {
    status: "cancelled",
    notes: reason || null,
    updatedAt: serverTimestamp(),
  });

  // Cloud Function이 자동으로 stats 재계산
}

/**
 * 경기 수정
 */
export async function updateTeamGame(
  gameId: string,
  updates: {
    scheduledAt?: Date;
    location?: string;
    address?: string;
    notes?: string;
  }
): Promise<void> {
  const gameRef = doc(db, "team_games", gameId);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  if (updates.scheduledAt) {
    updateData.scheduledAt = Timestamp.fromDate(updates.scheduledAt);
  }
  if (updates.location !== undefined) {
    updateData.location = updates.location || null;
  }
  if (updates.address !== undefined) {
    updateData.address = updates.address || null;
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes || null;
  }

  await updateDoc(gameRef, updateData);
}

/**
 * 팀의 경기 목록 조회
 */
export async function getTeamGames(
  teamId: string,
  options?: {
    status?: "scheduled" | "completed" | "all";
    gameType?: "friendly" | "league" | "tournament" | "scrimmage" | "all";
    limit?: number;
  }
): Promise<TeamGame[]> {
  const statusFilter = options?.status && options.status !== "all" 
    ? [where("status", "==", options.status)]
    : [];

  const gameTypeFilter = options?.gameType && options.gameType !== "all"
    ? [where("gameType", "==", options.gameType)]
    : [];

  // 홈팀 경기 조회
  const homeGamesQuery = query(
    collection(db, "team_games"),
    where("homeTeamId", "==", teamId),
    ...statusFilter,
    ...gameTypeFilter,
    orderBy("scheduledAt", "desc"),
    ...(options?.limit ? [firestoreLimit(options.limit)] : [])
  );

  // 원정팀 경기 조회
  const awayGamesQuery = query(
    collection(db, "team_games"),
    where("awayTeamId", "==", teamId),
    ...statusFilter,
    ...gameTypeFilter,
    orderBy("scheduledAt", "desc"),
    ...(options?.limit ? [firestoreLimit(options.limit)] : [])
  );

  const [homeGamesSnap, awayGamesSnap] = await Promise.all([
    getDocs(homeGamesQuery),
    getDocs(awayGamesQuery),
  ]);

  const allGames: TeamGame[] = [
    ...homeGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamGame)),
    ...awayGamesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamGame)),
  ];

  // 중복 제거
  const uniqueGames = Array.from(
    new Map(allGames.map(game => [game.id, game])).values()
  );

  // 날짜순 정렬
  return uniqueGames.sort((a, b) => {
    const aTime = a.scheduledAt?.toMillis() || 0;
    const bTime = b.scheduledAt?.toMillis() || 0;
    return bTime - aTime;
  });
}

/**
 * 경기 상세 조회
 */
export async function getTeamGame(gameId: string): Promise<TeamGame | null> {
  const gameDoc = await getDoc(doc(db, "team_games", gameId));
  
  if (!gameDoc.exists()) {
    return null;
  }

  return { id: gameDoc.id, ...gameDoc.data() } as TeamGame;
}

/**
 * 경기 삭제
 */
export async function deleteTeamGame(gameId: string): Promise<void> {
  const gameRef = doc(db, "team_games", gameId);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  await deleteDoc(gameRef);

  // Cloud Function이 자동으로 stats 재계산
}

/**
 * 팀별 출전 스냅샷 저장 (playParticipation.byTeam · 점진 도입 필드)
 */
export async function updateTeamGamePlayParticipation(
  gameId: string,
  teamId: string,
  payload: {
    entries: TeamGamePlayParticipationEntry[];
    quarterMinutePlan?: number[];
  }
): Promise<void> {
  const gameRef = doc(db, "team_games", gameId);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists()) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const prev = (gameDoc.data() as TeamGame).playParticipation as TeamGamePlayParticipation | null | undefined;

  const merged: TeamGamePlayParticipation = {
    ...(prev && typeof prev === "object" ? prev : {}),
    byTeam: {
      ...(prev?.byTeam || {}),
      [teamId]: { entries: payload.entries },
    },
  };
  if (payload.quarterMinutePlan?.length) {
    merged.quarterMinutePlan = payload.quarterMinutePlan;
  }

  await updateDoc(gameRef, {
    playParticipation: merged,
    updatedAt: serverTimestamp(),
  });
}
