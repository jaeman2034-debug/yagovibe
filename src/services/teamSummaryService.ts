/**
 * 🔥 Team Summary 서비스
 * 
 * 역할:
 * - team_summary 조회
 * - team_match_history 조회
 * - team_awards 조회
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamSummary, TeamMatchHistory, TeamAward } from "@/types/teamSummary";

/**
 * Team Summary 조회
 */
export async function getTeamSummary(teamId: string): Promise<TeamSummary | null> {
  try {
    const docRef = doc(db, "team_summary", teamId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return { id: docSnap.id, ...docSnap.data() } as TeamSummary;
  } catch (error) {
    console.error("[getTeamSummary] 조회 실패:", error);
    return null;
  }
}

/**
 * Team Match History 조회
 */
export async function getTeamMatchHistory(
  teamId: string,
  options?: { limit?: number }
): Promise<TeamMatchHistory[]> {
  try {
    const constraints = [
      where("teamId", "==", teamId),
      orderBy("matchDate", "desc"),
    ];
    
    if (options?.limit) {
      constraints.push(limit(options.limit));
    }
    
    const q = query(collection(db, "team_match_history"), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TeamMatchHistory[];
  } catch (error) {
    console.error("[getTeamMatchHistory] 조회 실패:", error);
    return [];
  }
}

/**
 * Team Awards 조회
 */
export async function getTeamAwards(teamId: string): Promise<TeamAward[]> {
  try {
    const q = query(
      collection(db, "team_awards"),
      where("teamId", "==", teamId),
      orderBy("awardedAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TeamAward[];
  } catch (error) {
    console.error("[getTeamAwards] 조회 실패:", error);
    return [];
  }
}

export type CreateTeamAwardInput = {
  teamId: string;
  title: string;
  awardType: TeamAward["awardType"];
  awardedAt: Date;
  eventId?: string;
};

/**
 * 팀 수상 수동 등록 (공개 허브 운영자)
 */
export async function createTeamAward(input: CreateTeamAwardInput): Promise<string> {
  const ref = await addDoc(collection(db, "team_awards"), {
    teamId: input.teamId,
    eventId: input.eventId?.trim() || "manual",
    title: input.title.trim(),
    awardType: input.awardType,
    awardedAt: Timestamp.fromDate(input.awardedAt),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteTeamAward(awardId: string): Promise<void> {
  await deleteDoc(doc(db, "team_awards", awardId));
}
