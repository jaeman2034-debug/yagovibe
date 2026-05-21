/**
 * 🔥 Firestore 읽기 전용 함수 (공개 대진표용)
 * 로그인 없이 대진표 데이터를 조회
 */

import { collection, doc, getDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PublicBracketData {
  tournament: any;
  rounds: Array<{
    id: string;
    roundNumber?: number;
    title?: string;
    name?: string;
    [key: string]: any;
  }>;
  matches: Array<{
    id: string;
    roundNumber?: number;
    homeTeamName?: string;
    homeTeamId?: string;
    awayTeamName?: string;
    awayTeamId?: string;
    winnerTeamId?: string;
    homeScore?: number;
    awayScore?: number;
    scheduledAt?: any;
    venue?: string;
    field?: string;
    status?: string;
    [key: string]: any;
  }>;
}

/**
 * 공개 대진표 데이터 로드
 */
export async function loadPublicBracket(
  associationId: string,
  tournamentId: string
): Promise<PublicBracketData> {
  const tRef = doc(
    db,
    "associations",
    associationId,
    "tournaments",
    tournamentId
  );

  const tournamentSnap = await getDoc(tRef);
  if (!tournamentSnap.exists()) {
    throw new Error("Tournament not found");
  }

  const roundsRef = collection(tRef, "rounds");
  const roundsQuery = query(roundsRef, orderBy("roundNumber", "asc"));
  const roundsSnap = await getDocs(roundsQuery);

  const matchesRef = collection(tRef, "matches");
  const matchesQuery = query(matchesRef, orderBy("roundNumber", "asc"));
  const matchesSnap = await getDocs(matchesQuery);

  return {
    tournament: tournamentSnap.data(),
    rounds: roundsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    matches: matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

