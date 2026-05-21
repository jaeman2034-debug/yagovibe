/**
 * 🔥 검인 Repository 레이어
 * Option B: Firestore 직접 호출 (실시간성 보장)
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TOURNAMENT_COLLECTIONS } from "./constants";
import type { CheckInLog, RosterItem } from "@/types/tournament";

/**
 * POST /tournaments/{tid}/matches/{mid}/checkins : 검인 기록 생성
 * 
 * QR 스캔 또는 수동 검인 시 호출
 */
export async function createCheckIn(
  associationId: string,
  tournamentId: string,
  matchId: string,
  data: {
    playerId: string;
    method: "QR" | "MANUAL";
    result: "SUCCESS" | "NOT_REGISTERED" | "INELIGIBLE";
    message?: string;
    checkedBy: string;
    joinKfaId?: string;
    verified: boolean;
  }
): Promise<string> {
  const checkinsRef = collection(
    db,
    TOURNAMENT_COLLECTIONS.checkins(associationId, tournamentId, matchId)
  );
  
  const docRef = await addDoc(checkinsRef, {
    matchId,
    playerId: data.playerId,
    method: data.method,
    result: data.result,
    message: data.message,
    checkedAt: serverTimestamp(),
    checkedBy: data.checkedBy,
    joinKfaId: data.joinKfaId,
    verified: data.verified,
  });

  // 검인 성공 시 Roster 업데이트
  if (data.result === "SUCCESS") {
    const rostersRef = collection(
      db,
      TOURNAMENT_COLLECTIONS.rosters(associationId, tournamentId, matchId)
    );
    const rostersQuery = query(rostersRef, where("playerId", "==", data.playerId));
    const rostersSnap = await getDocs(rostersQuery);
    
    if (!rostersSnap.empty) {
      const rosterRef = rostersSnap.docs[0].ref;
      await updateDoc(rosterRef, {
        checked: true,
      });
    }
  }

  return docRef.id;
}

/**
 * 경기별 검인 기록 조회
 */
export async function getCheckIns(
  associationId: string,
  tournamentId: string,
  matchId: string
): Promise<CheckInLog[]> {
  const checkinsRef = collection(
    db,
    TOURNAMENT_COLLECTIONS.checkins(associationId, tournamentId, matchId)
  );
  const snapshot = await getDocs(checkinsRef);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CheckInLog[];
}

