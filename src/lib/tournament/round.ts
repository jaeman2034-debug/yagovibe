/**
 * 🔥 라운드 관리
 * 
 * 구조:
 * rounds/{roundId}
 * 
 * 역할:
 * - 대회 내 라운드 생성
 * - 라운드별 경기 관리
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Round {
  id: string;
  tournamentId: string;
  name: string;
  order: number;
  createdAt: any;
}

/**
 * 라운드 생성
 */
export async function createRound({
  tournamentId,
  name,
  order,
}: {
  tournamentId: string;
  name: string;
  order: number;
}): Promise<string> {
  if (!tournamentId || !name || order == null) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  const roundRef = await addDoc(collection(db, "rounds"), {
    tournamentId,
    name,
    order,
    createdAt: serverTimestamp(),
  });

  return roundRef.id;
}

/**
 * 대회의 라운드 목록 조회
 */
export async function getTournamentRounds(
  tournamentId: string
): Promise<Round[]> {
  const q = query(
    collection(db, "rounds"),
    where("tournamentId", "==", tournamentId),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Round[];
}
