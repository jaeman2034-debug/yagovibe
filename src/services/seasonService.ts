/**
 * 🔥 시즌 서비스
 * 
 * 역할:
 * - 시즌 생성/조회
 * - 현재 활성 시즌 조회
 * - 시즌별 통계 조회
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
  serverTimestamp,
  Timestamp,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Season, SeasonStats } from "@/types/season";

/**
 * 시즌 생성
 */
export async function createSeason(input: {
  name: string;
  sportType: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  createdBy: string;
}): Promise<string> {
  const seasonData: Omit<Season, "id"> = {
    name: input.name,
    sportType: input.sportType,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: Timestamp.fromDate(input.endDate),
    status: "upcoming",
    description: input.description,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  };

  const seasonRef = await addDoc(collection(db, "seasons"), seasonData);
  return seasonRef.id;
}

/**
 * 시즌 조회
 */
export async function getSeason(seasonId: string): Promise<Season | null> {
  const seasonDoc = await getDoc(doc(db, "seasons", seasonId));
  
  if (!seasonDoc.exists()) {
    return null;
  }

  return { id: seasonDoc.id, ...seasonDoc.data() } as Season;
}

/**
 * 시즌 목록 조회
 */
export async function getSeasons(options?: {
  sportType?: string;
  status?: "upcoming" | "active" | "completed";
  limit?: number;
}): Promise<Season[]> {
  let q: any = collection(db, "seasons");

  if (options?.sportType) {
    q = query(q, where("sportType", "==", options.sportType));
  }

  if (options?.status) {
    q = query(q, where("status", "==", options.status));
  }

  q = query(q, orderBy("startDate", "desc"));

  if (options?.limit) {
    q = query(q, firestoreLimit(options.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Season[];
}

/**
 * 현재 활성 시즌 조회
 */
export async function getActiveSeason(sportType?: string): Promise<Season | null> {
  const now = Timestamp.now();
  
  let q: any = query(
    collection(db, "seasons"),
    where("status", "==", "active"),
    where("startDate", "<=", now),
    where("endDate", ">=", now)
  );

  if (sportType) {
    q = query(q, where("sportType", "==", sportType));
  }

  q = query(q, orderBy("startDate", "desc"), firestoreLimit(1));

  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Season;
}

/**
 * 시즌별 팀 통계 조회
 */
export async function getTeamSeasonStats(
  teamId: string,
  seasonId: string
): Promise<SeasonStats | null> {
  const statsDoc = await getDoc(doc(db, "teams", teamId, "season_stats", seasonId));
  
  if (!statsDoc.exists()) {
    return null;
  }

  return {
    seasonId: statsDoc.id,
    teamId,
    ...statsDoc.data(),
  } as SeasonStats;
}

/**
 * 시즌별 팀 통계 목록 조회
 */
export async function getTeamSeasonStatsList(teamId: string): Promise<SeasonStats[]> {
  const q = query(
    collection(db, "teams", teamId, "season_stats"),
    orderBy("lastUpdatedAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    seasonId: doc.id,
    teamId,
    ...doc.data(),
  })) as SeasonStats[];
}
