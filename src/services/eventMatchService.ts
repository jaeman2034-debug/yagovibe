/**
 * 🔥 Event Match 서비스
 * 
 * 역할:
 * - Event Match 생성
 * - 경기 결과 입력
 * - 경기 일정 조회
 * 
 * 핵심: 경기 결과 입력 시 자동으로 Cloud Function이 실행되어
 * team_games, rankings, summaries가 자동 업데이트됩니다.
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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EventMatch } from "@/types/event";

/**
 * Event Match 생성
 */
export async function createEventMatch(input: {
  eventId: string;
  divisionId: string;
  seasonId?: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  scheduledAt: Date;
  venueName?: string;
  venueAddress?: string;
  roundCode?: string;
  roundName?: string;
  stageType?: "group" | "knockout" | "league";
  createdBy: string;
}): Promise<string> {
  const matchData: Omit<EventMatch, "id" | "createdAt" | "updatedAt"> = {
    eventId: input.eventId,
    divisionId: input.divisionId,
    seasonId: input.seasonId || null,
    homeTeamId: input.homeTeamId,
    homeTeamName: input.homeTeamName,
    awayTeamId: input.awayTeamId,
    awayTeamName: input.awayTeamName,
    scheduledAt: Timestamp.fromDate(input.scheduledAt),
    venueName: input.venueName || null,
    venueAddress: input.venueAddress || null,
    roundCode: input.roundCode || null,
    roundName: input.roundName || null,
    stageType: input.stageType || "knockout",
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    winnerTeamId: null,
    createdBy: input.createdBy,
  };

  const matchRef = await addDoc(collection(db, "event_matches"), matchData);
  return matchRef.id;
}

/**
 * Event Match 조회
 */
export async function getEventMatch(matchId: string): Promise<EventMatch | null> {
  const matchDoc = await getDoc(doc(db, "event_matches", matchId));
  
  if (!matchDoc.exists()) {
    return null;
  }

  return { id: matchDoc.id, ...matchDoc.data() } as EventMatch;
}

/**
 * Event Matches 조회
 */
export async function getEventMatches(options: {
  eventId: string;
  divisionId?: string;
  roundCode?: string;
  status?: EventMatch["status"];
  limit?: number;
}): Promise<EventMatch[]> {
  let q: any = query(
    collection(db, "event_matches"),
    where("eventId", "==", options.eventId)
  );

  if (options.divisionId) {
    q = query(q, where("divisionId", "==", options.divisionId));
  }

  if (options.roundCode) {
    q = query(q, where("roundCode", "==", options.roundCode));
  }

  if (options.status) {
    q = query(q, where("status", "==", options.status));
  }

  q = query(q, orderBy("scheduledAt", "asc"));

  if (options.limit) {
    const { limit } = await import("firebase/firestore");
    q = query(q, limit(options.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as EventMatch[];
}

/**
 * 경기 결과 입력 (핵심 함수)
 * 
 * 이 함수를 호출하면:
 * 1. event_matches 문서 업데이트
 * 2. onEventMatchCompleted Cloud Function 자동 실행
 * 3. team_games 자동 생성
 * 4. teams.stats 자동 업데이트
 * 5. rankings 자동 업데이트 (리그인 경우)
 * 6. team_event_summary 자동 업데이트
 * 7. team_season_summary 자동 업데이트
 */
export async function completeEventMatch(
  matchId: string,
  result: {
    homeScore: number;
    awayScore: number;
    recordedBy: string;
    playedAt?: Date;
  }
): Promise<void> {
  const { homeScore, awayScore, recordedBy, playedAt } = result;

  // 승자 결정
  let winnerTeamId: string | null = null;
  if (homeScore > awayScore) {
    const match = await getEventMatch(matchId);
    winnerTeamId = match?.homeTeamId || null;
  } else if (awayScore > homeScore) {
    const match = await getEventMatch(matchId);
    winnerTeamId = match?.awayTeamId || null;
  }

  await updateDoc(doc(db, "event_matches", matchId), {
    homeScore,
    awayScore,
    winnerTeamId,
    status: "completed",
    recordedBy,
    recordedAt: serverTimestamp(),
    playedAt: playedAt ? Timestamp.fromDate(playedAt) : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Cloud Function이 자동으로 나머지 처리
}

/**
 * 경기 일정 수정
 */
export async function updateEventMatchSchedule(
  matchId: string,
  schedule: {
    scheduledAt?: Date;
    venueName?: string;
    venueAddress?: string;
  }
): Promise<void> {
  const updateData: any = {
    updatedAt: serverTimestamp(),
  };

  if (schedule.scheduledAt) {
    updateData.scheduledAt = Timestamp.fromDate(schedule.scheduledAt);
  }

  if (schedule.venueName !== undefined) {
    updateData.venueName = schedule.venueName || null;
  }

  if (schedule.venueAddress !== undefined) {
    updateData.venueAddress = schedule.venueAddress || null;
  }

  await updateDoc(doc(db, "event_matches", matchId), updateData);
}

/**
 * 경기 취소
 */
export async function cancelEventMatch(
  matchId: string,
  cancelledBy: string,
  reason?: string
): Promise<void> {
  await updateDoc(doc(db, "event_matches", matchId), {
    status: "cancelled",
    cancelledBy,
    cancelledAt: serverTimestamp(),
    cancellationReason: reason || null,
    updatedAt: serverTimestamp(),
  });
}
