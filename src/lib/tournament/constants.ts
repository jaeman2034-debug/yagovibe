/**
 * 🔥 대회 운영 Firestore 컬렉션/문서 상수
 * Option B: 데이터 구조 확정
 */

/**
 * Firestore 컬렉션 경로 상수
 */
export const TOURNAMENT_COLLECTIONS = {
  // 대회
  tournaments: (associationId: string) => 
    `associations/${associationId}/tournaments`,
  
  tournament: (associationId: string, tournamentId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}`,
  
  // 경기장
  venues: (associationId: string, tournamentId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/venues`,
  
  venue: (associationId: string, tournamentId: string, venueId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/venues/${venueId}`,
  
  // 경기
  matches: (associationId: string, tournamentId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/matches`,
  
  match: (associationId: string, tournamentId: string, matchId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}`,
  
  // 출전 명단
  rosters: (associationId: string, tournamentId: string, matchId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/rosters`,
  
  // 검인 기록
  checkins: (associationId: string, tournamentId: string, matchId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/checkins`,
  
  // 경고/퇴장
  cards: (associationId: string, tournamentId: string, matchId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/cards`,
  
  // 심판 메모
  memos: (associationId: string, tournamentId: string, matchId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/memos`,
  
  // 참가 신청
  applications: (associationId: string, tournamentId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/applications`,
  
  // 선수
  players: (associationId: string, tournamentId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/players`,
  
  // QR 토큰
  qrTokens: (associationId: string, tournamentId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/qrTokens`,
  
  // 통계
  stats: (associationId: string, tournamentId: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/stats`,
  
  stat: (associationId: string, tournamentId: string, dateKey: string) =>
    `associations/${associationId}/tournaments/${tournamentId}/stats/${dateKey}`,
} as const;

/**
 * 역할 기반 권한
 */
export const TOURNAMENT_ROLES = {
  ADMIN: "ADMIN",
  REFEREE: "REFEREE",
  TEAM: "TEAM",
  PLAYER: "PLAYER",
} as const;

export type TournamentRole = typeof TOURNAMENT_ROLES[keyof typeof TOURNAMENT_ROLES];

