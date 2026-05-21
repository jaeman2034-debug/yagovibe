/**
 * 🔥 경기 Repository 레이어
 * Option B: Firestore 직접 호출 (실시간성 보장)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TOURNAMENT_COLLECTIONS } from "./constants";
import type {
  MatchOps,
  MatchDetailOps,
  RosterItem,
  CheckInLog,
  CardLog,
  MemoOps,
} from "@/types/tournament";

/**
 * GET /tournaments/{tid}/matches/{mid} : 경기 상세 (한번에 가져오기)
 * 
 * 경기 운영에서 가장 자주 호출되는 함수
 * 경기 상세 화면 진입 시 한번에 모든 데이터 로드
 */
export async function getMatchDetail(
  associationId: string,
  tournamentId: string,
  matchId: string
): Promise<MatchDetailOps | null> {
  // 1. 경기 기본 정보
  const matchRef = doc(
    db,
    TOURNAMENT_COLLECTIONS.match(associationId, tournamentId, matchId)
  );
  const matchSnap = await getDoc(matchRef);
  
  if (!matchSnap.exists()) {
    return null;
  }

  const match = {
    id: matchSnap.id,
    ...matchSnap.data(),
  } as MatchOps;

  // 2. 서브컬렉션 병렬 조회 (성능 최적화)
  const [rostersSnap, checkinsSnap, cardsSnap, memosSnap] = await Promise.all([
    // 출전 명단
    getDocs(
      collection(
        db,
        TOURNAMENT_COLLECTIONS.rosters(associationId, tournamentId, matchId)
      )
    ),
    // 검인 기록
    getDocs(
      collection(
        db,
        TOURNAMENT_COLLECTIONS.checkins(associationId, tournamentId, matchId)
      )
    ),
    // 경고/퇴장
    getDocs(
      collection(
        db,
        TOURNAMENT_COLLECTIONS.cards(associationId, tournamentId, matchId)
      )
    ),
    // 심판 메모
    getDocs(
      collection(
        db,
        TOURNAMENT_COLLECTIONS.memos(associationId, tournamentId, matchId)
      )
    ),
  ]);

  return {
    ...match,
    rosters: rostersSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as RosterItem[],
    checkins: checkinsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CheckInLog[],
    cards: cardsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as CardLog[],
    memos: memosSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as MemoOps[],
  };
}

/**
 * 경기 상태 업데이트
 */
export async function updateMatchStatus(
  associationId: string,
  tournamentId: string,
  matchId: string,
  status: "WAIT" | "LIVE" | "END" | "CANCELLED",
  additionalData?: {
    startedAt?: Timestamp;
    endedAt?: Timestamp;
    score?: { home: number; away: number };
  }
): Promise<void> {
  const { updateDoc } = await import("firebase/firestore");
  const matchRef = doc(
    db,
    TOURNAMENT_COLLECTIONS.match(associationId, tournamentId, matchId)
  );
  
  await updateDoc(matchRef, {
    status,
    updatedAt: serverTimestamp(),
    ...(additionalData || {}),
  });
}

