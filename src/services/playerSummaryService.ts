/**
 * 🔥 Player Summary 서비스
 * 
 * 역할:
 * - player_summary 조회
 * - player_match_history 조회
 * - player_awards 조회
 * - player_event_summary 조회
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlayerSummary, PlayerMatchHistory, PlayerAward } from "@/types/playerSummary";
import type { PlayerEventSummary } from "@/types/playerStats";

/**
 * Player Summary 조회
 */
export async function getPlayerSummary(playerId: string): Promise<PlayerSummary | null> {
  try {
    const docRef = doc(db, "player_summary", playerId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return { id: docSnap.id, ...docSnap.data() } as PlayerSummary;
  } catch (error) {
    console.error("[getPlayerSummary] 조회 실패:", error);
    return null;
  }
}

/**
 * Player Match History 조회
 */
export async function getPlayerMatchHistory(
  playerId: string,
  options?: { limit?: number }
): Promise<PlayerMatchHistory[]> {
  try {
    const constraints = [
      where("playerId", "==", playerId),
      orderBy("matchDate", "desc"),
    ];
    
    if (options?.limit) {
      constraints.push(limit(options.limit));
    }
    
    const q = query(collection(db, "player_match_history"), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PlayerMatchHistory[];
  } catch (error) {
    console.error("[getPlayerMatchHistory] 조회 실패:", error);
    return [];
  }
}

/**
 * Player Awards 조회
 */
export async function getPlayerAwards(playerId: string): Promise<PlayerAward[]> {
  try {
    const q = query(
      collection(db, "player_awards"),
      where("playerId", "==", playerId),
      orderBy("awardedAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PlayerAward[];
  } catch (error) {
    console.error("[getPlayerAwards] 조회 실패:", error);
    return [];
  }
}

/**
 * Player Event Summaries 조회
 */
export async function getPlayerEventSummaries(playerId: string): Promise<PlayerEventSummary[]> {
  try {
    const q = query(
      collection(db, "player_event_summaries"),
      where("playerId", "==", playerId),
      orderBy("updatedAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PlayerEventSummary[];
  } catch (error) {
    console.error("[getPlayerEventSummaries] 조회 실패:", error);
    return [];
  }
}
