/**
 * 🔥 대회 운영 Repository 레이어
 * Option B: API 스펙 (Firestore 직결)
 * 
 * 원칙:
 * - 모든 데이터는 tournamentId 기준 파티셔닝
 * - 읽기/쓰기 권한은 역할(Role) 기반
 * - ADMIN(운영자), REFEREE(심판), TEAM(팀), PLAYER(선수)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  TournamentOps,
  VenueOps,
  MatchOps,
  RosterItem,
  CheckInLog,
  CardLog,
  MemoOps,
  TournamentApplication,
  PlayerOps,
  QRToken,
  TournamentDashboardStats,
  MatchDetailOps,
} from "@/types/tournament";

// ============================================================================
// 🔥 대회 관리
// ============================================================================

/**
 * POST /tournaments : 대회 생성
 */
export async function createTournament(
  associationId: string,
  data: {
    name: string;
    startDate: string;
    endDate: string;
    organizer: string;
    location: string;
    createdBy: string;
  }
): Promise<string> {
  const tournamentsRef = collection(db, `associations/${associationId}/tournaments`);
  const docRef = await addDoc(tournamentsRef, {
    name: data.name,
    startDate: Timestamp.fromDate(new Date(data.startDate)),
    endDate: Timestamp.fromDate(new Date(data.endDate)),
    status: "PREPARE" as const,
    organizer: data.organizer,
    location: data.location,
    tenantId: associationId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: data.createdBy,
  });
  return docRef.id;
}

/**
 * GET /tournaments : 내 권한 대회 리스트
 */
export async function getTournaments(associationId: string): Promise<TournamentOps[]> {
  const tournamentsRef = collection(db, `associations/${associationId}/tournaments`);
  const snapshot = await getDocs(tournamentsRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TournamentOps[];
}

/**
 * GET /tournaments/{tid} : 대회 상세(+ stats)
 */
export async function getTournament(
  associationId: string,
  tournamentId: string
): Promise<TournamentOps | null> {
  const tournamentRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}`
  );
  const snapshot = await getDoc(tournamentRef);
  if (!snapshot.exists()) return null;
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as TournamentOps;
}

/**
 * GET /tournaments/{tid}/stats : 대회 통계
 */
export async function getTournamentStats(
  associationId: string,
  tournamentId: string,
  dateKey: string // "2026-08-19"
): Promise<TournamentDashboardStats | null> {
  const statsRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/stats/${dateKey}`
  );
  const snapshot = await getDoc(statsRef);
  if (!snapshot.exists()) return null;
  return {
    dateKey,
    ...snapshot.data(),
  } as TournamentDashboardStats;
}

// ============================================================================
// 🔥 경기장 관리
// ============================================================================

/**
 * POST /tournaments/{tid}/venues : 경기장 생성
 */
export async function createVenue(
  associationId: string,
  tournamentId: string,
  data: {
    name: string;
    courtCount: number;
    address?: string;
  }
): Promise<string> {
  const venuesRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/venues`
  );
  const docRef = await addDoc(venuesRef, {
    tournamentId,
    name: data.name,
    courtCount: data.courtCount,
    address: data.address,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * GET /tournaments/{tid}/venues : 경기장 목록
 */
export async function getVenues(
  associationId: string,
  tournamentId: string
): Promise<VenueOps[]> {
  const venuesRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/venues`
  );
  const snapshot = await getDocs(venuesRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as VenueOps[];
}

// ============================================================================
// 🔥 경기 관리
// ============================================================================

/**
 * POST /tournaments/{tid}/matches:bulkUpsert : 경기 일괄 생성
 */
export async function createMatchesBulk(
  associationId: string,
  tournamentId: string,
  matches: Array<{
    venueId: string;
    courtNo: number;
    date: string;
    startTime: string;
    endTime: string;
    homeTeam: string;
    homeTeamId?: string;
    awayTeam: string;
    awayTeamId?: string;
  }>
): Promise<string[]> {
  const matchesRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches`
  );
  const batch = writeBatch(db);
  const matchIds: string[] = [];

  // 임시 문서 생성으로 ID 미리 확보
  const tempDocs = matches.map(() => doc(matchesRef));
  tempDocs.forEach((tempDoc, index) => {
    const match = matches[index];
    batch.set(tempDoc, {
      tournamentId,
      venueId: match.venueId,
      courtNo: match.courtNo,
      date: match.date,
      startTime: match.startTime,
      endTime: match.endTime,
      homeTeam: match.homeTeam,
      homeTeamId: match.homeTeamId,
      awayTeam: match.awayTeam,
      awayTeamId: match.awayTeamId,
      division: (match as any).division || "", // 🔥 조 정보 추가
      referees: {},
      status: "WAIT" as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    matchIds.push(tempDoc.id);
  });

  await batch.commit();
  return matchIds;
}

/**
 * GET /tournaments/{tid}/matches : 경기 목록
 */
export async function getMatches(
  associationId: string,
  tournamentId: string,
  filters?: {
    venueId?: string;
    date?: string;
  }
): Promise<MatchOps[]> {
  const matchesRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches`
  );
  
  let q = query(matchesRef, orderBy("date", "asc"), orderBy("startTime", "asc"));
  
  if (filters?.venueId) {
    q = query(q, where("venueId", "==", filters.venueId));
  }
  if (filters?.date) {
    q = query(q, where("date", "==", filters.date));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MatchOps[];
}

/**
 * GET /tournaments/{tid}/matches/{mid} : 경기 상세
 */
export async function getMatch(
  associationId: string,
  tournamentId: string,
  matchId: string
): Promise<MatchDetailOps | null> {
  const matchRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}`
  );
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) return null;

  const match = {
    id: matchSnap.id,
    ...matchSnap.data(),
  } as MatchOps;

  // 서브컬렉션 조회
  const [rostersSnap, checkinsSnap, cardsSnap, memosSnap] = await Promise.all([
    getDocs(
      collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/rosters`
      )
    ),
    getDocs(
      collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/checkins`
      )
    ),
    getDocs(
      collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/cards`
      )
    ),
    getDocs(
      collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/memos`
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
 * POST /tournaments/{tid}/matches/{mid}/checkins : 검인 기록
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
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/checkins`
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

  // Roster 업데이트 (검인 완료)
  if (data.result === "SUCCESS") {
    const rostersRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/rosters`
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
 * POST /tournaments/{tid}/matches/{mid}/cards : 경고/퇴장 기록
 */
export async function createCard(
  associationId: string,
  tournamentId: string,
  matchId: string,
  data: {
    playerId: string;
    type: "YELLOW" | "RED";
    minute?: number;
    reason?: string;
    recordedBy: string;
  }
): Promise<string> {
  const cardsRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/cards`
  );
  const docRef = await addDoc(cardsRef, {
    matchId,
    playerId: data.playerId,
    type: data.type,
    minute: data.minute,
    reason: data.reason,
    recordedAt: serverTimestamp(),
    recordedBy: data.recordedBy,
  });
  return docRef.id;
}

/**
 * POST /tournaments/{tid}/matches/{mid}/memos : 심판 메모
 */
export async function createMemo(
  associationId: string,
  tournamentId: string,
  matchId: string,
  data: {
    text: string;
    createdBy: string;
  }
): Promise<string> {
  const memosRef = collection(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/memos`
  );
  const docRef = await addDoc(memosRef, {
    matchId,
    text: data.text,
    createdAt: serverTimestamp(),
    createdBy: data.createdBy,
  });
  return docRef.id;
}

/**
 * POST /tournaments/{tid}/matches/{mid}/start : 경기 시작
 */
export async function startMatch(
  associationId: string,
  tournamentId: string,
  matchId: string
): Promise<void> {
  const matchRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}`
  );
  await updateDoc(matchRef, {
    status: "LIVE" as const,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * POST /tournaments/{tid}/matches/{mid}/end : 경기 종료
 */
export async function endMatch(
  associationId: string,
  tournamentId: string,
  matchId: string,
  score?: { home: number; away: number }
): Promise<void> {
  const matchRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}`
  );
  await updateDoc(matchRef, {
    status: "END" as const,
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(score && { score }),
  });
}

// ============================================================================
// 🔥 대회 종료 Lock
// ============================================================================

/**
 * 대회 종료 (기록 잠금)
 * ADMIN만 호출 가능
 */
export async function lockTournament(
  associationId: string,
  tournamentId: string
): Promise<void> {
  const tournamentRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}`
  );
  
  await updateDoc(tournamentRef, {
    status: "LOCKED" as const,
    lockedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 대회 Lock 상태 확인
 */
export async function isTournamentLocked(
  associationId: string,
  tournamentId: string
): Promise<boolean> {
  const tournamentRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}`
  );
  const snapshot = await getDoc(tournamentRef);
  
  if (!snapshot.exists()) return false;
  
  const data = snapshot.data() as any;
  return data.status === "LOCKED";
}

// ============================================================================
// 🔥 QR 관리
// ============================================================================

/**
 * POST /tournaments/{tid}/qr/verify : QR 검증
 */
export async function verifyQR(
  associationId: string,
  tournamentId: string,
  token: string
): Promise<{
  valid: boolean;
  playerId?: string;
  playerName?: string;
  message?: string;
}> {
  // TODO: QR 토큰 검증 로직 구현
  // 1. qrTokens 컬렉션에서 tokenHash로 조회
  // 2. expiresAt 체크
  // 3. status === "ACTIVE" 체크
  // 4. playerId 반환
  
  // 임시 구현
  return {
    valid: false,
    message: "QR 검증 기능 구현 중",
  };
}

/**
 * POST /tournaments/{tid}/qr/issue : QR 발급
 */
export async function issueQR(
  associationId: string,
  tournamentId: string,
  playerId: string
): Promise<{
  token: string;
  qrCode: string; // Base64 이미지
  expiresAt: Timestamp;
}> {
  // TODO: QR 토큰 생성 로직 구현
  // 1. 토큰 생성 (암호화)
  // 2. qrTokens 문서 생성/업데이트
  // 3. QR 코드 이미지 생성 (Base64)
  
  // 임시 구현
  throw new Error("QR 발급 기능 구현 중");
}

