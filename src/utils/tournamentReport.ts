/**
 * 🔥 대회 종료 후 리포트 생성 함수
 * 우승/준우승, 경기 수, 참가 팀 수, 연령대별 요약
 * JSON 형식으로 리포트 데이터 생성 (화면/문서 공용)
 */

import type { Tournament } from "@/types/tournament";

type Round = {
  id: string;
  roundNumber?: number;
  title?: string;
  name?: string;
};

type Match = {
  id: string;
  roundNumber?: number;
  homeTeamName?: string;
  homeTeamId?: string;
  awayTeamName?: string;
  awayTeamId?: string;
  winnerTeamId?: string;
  homeScore?: number;
  awayScore?: number;
};

export interface TournamentReport {
  name: string;
  ageGroup?: string;
  completedAt?: Date;
  winner?: string;
  winnerTeamName?: string;
  totalMatches: number;
  rounds: Array<{
    roundNumber: number;
    title: string;
    matches: Array<{
      home: string;
      away: string;
      winner?: string;
      homeScore?: number;
      awayScore?: number;
    }>;
  }>;
}

/**
 * 🔥 대회 종료 리포트 생성 함수
 * 우승/준우승, 경기 수, 참가 팀 수, 연령대별 요약 포함
 */
export function buildTournamentReport(
  tournament: Tournament,
  rounds: Round[],
  matches: Match[]
): TournamentReport {
  // 라운드별로 정렬 (roundNumber 기준)
  const sortedRounds = rounds
    .filter((r) => r.roundNumber != null)
    .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));

  // 완료 시간 추출
  const completedAt = tournament.status === "completed" && tournament.completedAt
    ? (tournament.completedAt as any)?.toDate?.() || new Date(tournament.completedAt as any)
    : tournament.status === "completed" && tournament.updatedAt
    ? (tournament.updatedAt as any)?.toDate?.() || new Date(tournament.updatedAt)
    : undefined;

  return {
    name: tournament.name,
    ageGroup: tournament.ageGroup,
    completedAt,
    winner: tournament.winnerTeamName,
    winnerTeamName: tournament.winnerTeamName,
    totalMatches: matches.length,
    rounds: sortedRounds.map((round) => ({
      roundNumber: round.roundNumber as number,
      title: (round.title || round.name) || `라운드 ${round.roundNumber}`,
      matches: matches
        .filter((m) => m.roundNumber === round.roundNumber)
        .map((m) => {
          const home = m.homeTeamName || m.homeTeamId || "TBD";
          const away = m.awayTeamName || m.awayTeamId || "TBD";
          
          // 승자 결정
          let winner: string | undefined;
          if (m.winnerTeamId) {
            if (m.winnerTeamId === m.homeTeamId) {
              winner = home;
            } else if (m.winnerTeamId === m.awayTeamId) {
              winner = away;
            }
          } else if (m.homeScore != null && m.awayScore != null) {
            if (m.homeScore > m.awayScore) {
              winner = home;
            } else if (m.awayScore > m.homeScore) {
              winner = away;
            }
          }

          return {
            home,
            away,
            winner,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
          };
        }),
    })),
  };
}

