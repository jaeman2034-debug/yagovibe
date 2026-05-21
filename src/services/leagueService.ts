/**
 * 🔥 리그 서비스
 * 
 * 역할:
 * - 리그 생성/수정/조회
 * - 리그 참가 팀 관리
 * - 리그 경기 관리
 * - 리그 순위 조회
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { League, LeagueTeam, LeagueGame, LeagueStanding } from "@/types/league";
import { createTeamGame } from "./teamGameService";

/**
 * 리그 생성
 */
export async function createLeague(input: {
  name: string;
  sportType: string;
  season: string;
  region: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  createdBy: string;
  mode?: "league" | "tournament";
  federationSlug?: string;
}): Promise<string> {
  // federation 컨텍스트 생성은 운영 대시보드/홈 탭과 동일한 데이터 모델을 사용한다.
  if (input.federationSlug) {
    const mode = input.mode === "league" ? "league" : "tournament";
    const fedLeagueRef = await addDoc(
      collection(db, "federations", input.federationSlug, "leagues"),
      {
        name: input.name,
        sportType: input.sportType,
        season: input.season,
        region: input.region,
        startDate: Timestamp.fromDate(input.startDate),
        endDate: Timestamp.fromDate(input.endDate),
        description: input.description,
        createdBy: input.createdBy,
        mode,
        status: "진행중",
        publishStatus: "draft",
        createdAt: serverTimestamp(),
      }
    );
    return fedLeagueRef.id;
  }

  const leagueData: Omit<League, "id"> = {
    name: input.name,
    sportType: input.sportType,
    season: input.season,
    region: input.region,
    status: "registration",
    startDate: Timestamp.fromDate(input.startDate),
    endDate: Timestamp.fromDate(input.endDate),
    createdBy: input.createdBy,
    description: input.description,
    createdAt: serverTimestamp(),
  };

  const leagueRef = await addDoc(collection(db, "leagues"), leagueData);
  return leagueRef.id;
}

/**
 * 리그 조회
 */
export async function getLeague(leagueId: string): Promise<League | null> {
  const leagueDoc = await getDoc(doc(db, "leagues", leagueId));
  
  if (!leagueDoc.exists()) {
    return null;
  }

  return { id: leagueDoc.id, ...leagueDoc.data() } as League;
}

/**
 * 리그 목록 조회
 */
export async function getLeagues(options?: {
  sportType?: string;
  status?: "registration" | "active" | "completed";
  limit?: number;
}): Promise<League[]> {
  let q: any = collection(db, "leagues");

  if (options?.sportType) {
    q = query(q, where("sportType", "==", options.sportType));
  }

  if (options?.status) {
    q = query(q, where("status", "==", options.status));
  }

  q = query(q, orderBy("createdAt", "desc"));

  if (options?.limit) {
    q = query(q, firestoreLimit(options.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as League[];
}

/**
 * 리그 참가 팀 추가
 */
export async function joinLeague(
  leagueId: string,
  teamId: string,
  teamName: string
): Promise<string> {
  // 중복 참가 체크
  const existingQuery = query(
    collection(db, "league_teams"),
    where("leagueId", "==", leagueId),
    where("teamId", "==", teamId)
  );
  const existingSnap = await getDocs(existingQuery);

  if (!existingSnap.empty) {
    throw new Error("이미 참가한 리그입니다.");
  }

  const teamData: Omit<LeagueTeam, "id"> = {
    leagueId,
    teamId,
    teamName,
    joinedAt: serverTimestamp(),
    status: "active",
  };

  const teamRef = await addDoc(collection(db, "league_teams"), teamData);
  return teamRef.id;
}

/**
 * 리그 참가 팀 목록 조회
 */
export async function getLeagueTeams(leagueId: string): Promise<LeagueTeam[]> {
  const q = query(
    collection(db, "league_teams"),
    where("leagueId", "==", leagueId),
    where("status", "==", "active"),
    orderBy("joinedAt", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LeagueTeam[];
}

/**
 * 리그 경기 생성
 */
export async function createLeagueGame(input: {
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  round?: number;
  createdBy: string;
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

  const gameData: Omit<LeagueGame, "id"> = {
    leagueId: input.leagueId,
    round: input.round,
    homeTeamId: input.homeTeamId,
    homeTeamName: homeTeamData.name,
    awayTeamId: input.awayTeamId,
    awayTeamName: awayTeamData.name,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    status: "scheduled",
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  };

  const gameRef = await addDoc(collection(db, "league_games"), gameData);
  return gameRef.id;
}

/**
 * 리그 경기 결과 입력
 */
export async function completeLeagueGame(
  leagueGameId: string,
  result: {
    homeScore: number;
    awayScore: number;
    playedAt?: Date;
    recordedBy: string;
  }
): Promise<void> {
  const leagueGameRef = doc(db, "league_games", leagueGameId);
  const leagueGameDoc = await getDoc(leagueGameRef);

  if (!leagueGameDoc.exists()) {
    throw new Error("리그 경기를 찾을 수 없습니다.");
  }

  const leagueGame = leagueGameDoc.data() as LeagueGame;

  if (leagueGame.status === "completed") {
    throw new Error("이미 완료된 경기입니다.");
  }

  // team_games에 연결
  let teamGameId = leagueGame.teamGameId;

  if (!teamGameId) {
    // team_games 생성
    teamGameId = await createTeamGame({
      homeTeamId: leagueGame.homeTeamId,
      awayTeamId: leagueGame.awayTeamId,
      scheduledAt: result.playedAt || leagueGame.scheduledAt.toDate(),
      gameType: "league",
      sourceType: "league",
      sourceId: leagueGameId,
      createdBy: result.recordedBy,
    });

    // 경기 결과도 함께 기록
    const { completeTeamGame } = await import("./teamGameService");
    await completeTeamGame(teamGameId, {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      playedAt: result.playedAt,
      recordedBy: result.recordedBy,
    });
  } else {
    // 기존 team_game 업데이트
    const { completeTeamGame } = await import("./teamGameService");
    await completeTeamGame(teamGameId, {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      playedAt: result.playedAt,
      recordedBy: result.recordedBy,
    });
  }

  // league_games 업데이트
  await updateDoc(leagueGameRef, {
    status: "completed",
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    playedAt: result.playedAt ? Timestamp.fromDate(result.playedAt) : serverTimestamp(),
    teamGameId,
    updatedAt: serverTimestamp(),
  });

  // Cloud Function이 자동으로 league_standings 업데이트
}

/**
 * 리그 경기 목록 조회
 */
export async function getLeagueGames(
  leagueId: string,
  options?: {
    status?: "scheduled" | "completed" | "all";
    round?: number;
  }
): Promise<LeagueGame[]> {
  let q: any = query(
    collection(db, "league_games"),
    where("leagueId", "==", leagueId)
  );

  if (options?.status && options.status !== "all") {
    q = query(q, where("status", "==", options.status));
  }

  if (options?.round !== undefined) {
    q = query(q, where("round", "==", options.round));
  }

  q = query(q, orderBy("scheduledAt", "asc"));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LeagueGame[];
}

/**
 * 리그 순위 조회
 */
export async function getLeagueStandings(leagueId: string): Promise<LeagueStanding[]> {
  const q = query(
    collection(db, "league_standings"),
    where("leagueId", "==", leagueId),
    orderBy("points", "desc"),
    orderBy("goalDiff", "desc"),
    orderBy("goalsFor", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LeagueStanding[];
}
