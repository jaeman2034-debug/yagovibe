/**
 * 제36회 노원구청장기 축구대회 실제 대진표 데이터
 * 이미지 1:1 매칭
 */

import type { Bracket, Match, AgeDivision } from "@/types/tournament";
import type { VenueId } from "@/types/venue";

interface RawMatch {
  id: string;
  round: number;
  order: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  venue: VenueId;
  home: string | { winnerOf: string } | { seed: number };
  away: string | { winnerOf: string } | { seed: number };
}

function createMatch(
  raw: RawMatch,
  division: AgeDivision,
  matchNumber: string
): Match {
  const homeSlot =
    typeof raw.home === "string"
      ? { type: "TEAM" as const, teamName: raw.home }
      : "winnerOf" in raw.home
      ? {
          type: "WINNER_OF_MATCH" as const,
          refMatchId: raw.home.winnerOf,
          refMatchNumber: `${raw.home.winnerOf} 경기 승자`,
        }
      : {
          type: "TEAM" as const,
          teamName: `시드 ${raw.home.seed}`,
        };

  const awaySlot =
    typeof raw.away === "string"
      ? { type: "TEAM" as const, teamName: raw.away }
      : "winnerOf" in raw.away
      ? {
          type: "WINNER_OF_MATCH" as const,
          refMatchId: raw.away.winnerOf,
          refMatchNumber: `${raw.away.winnerOf} 경기 승자`,
        }
      : {
          type: "TEAM" as const,
          teamName: `시드 ${raw.away.seed}`,
        };

  return {
    id: raw.id,
    matchNumber,
    division,
    round: getRoundLabel(raw.round),
    order: raw.order,
    date: `${raw.date}T00:00:00`,
    time: raw.time,
    venueId: raw.venue,
    venue: raw.venue, // 하위 호환성
    homeSlot,
    awaySlot,
    teamA: typeof raw.home === "string" ? raw.home : undefined,
    teamB: typeof raw.away === "string" ? raw.away : undefined,
    status: "scheduled" as const,
  };
}

function getRoundLabel(round: number): string {
  const labels: Record<number, string> = {
    1: "1회전",
    2: "8강",
    3: "준결승",
    4: "결승",
  };
  return labels[round] || `${round}회전`;
}

function createBracket(
  division: AgeDivision,
  rawMatches: RawMatch[]
): Bracket {
  const matches: Match[] = rawMatches.map((raw, index) => {
    const matchNumber = `${index + 1}경기`;
    return createMatch(raw, division, matchNumber);
  });

  return {
    division,
    matches,
    confirmed: true,
  };
}

// 20/30대 청년부
const YOUTH_RAW: RawMatch[] = [
  { id: "Y1", round: 1, order: 1, date: "2025-08-31", time: "09:30", venue: "MADEUL", home: "청원", away: "상계" },
  { id: "Y2", round: 1, order: 2, date: "2025-08-31", time: "10:30", venue: "MADEUL", home: "새벽A", away: "월계" },
  { id: "Y3", round: 1, order: 3, date: "2025-08-31", time: "11:30", venue: "MADEUL", home: "공일", away: "한울" },
  { id: "Y4", round: 1, order: 4, date: "2025-08-31", time: "12:30", venue: "MADEUL", home: "노해", away: "비호" },
  { id: "Y5", round: 3, order: 2, date: "2025-09-07", time: "09:00", venue: "MADEUL", home: { winnerOf: "Y1" }, away: { winnerOf: "Y2" } },
  { id: "Y6", round: 3, order: 3, date: "2025-09-07", time: "10:00", venue: "MADEUL", home: { winnerOf: "Y3" }, away: { winnerOf: "Y4" } },
  { id: "Y7", round: 4, order: 6, date: "2025-09-07", time: "13:00", venue: "MADEUL", home: { winnerOf: "Y5" }, away: { winnerOf: "Y6" } },
];

// 40대 장년부
const FORTY_RAW: RawMatch[] = [
  { id: "F1", round: 1, order: 1, date: "2025-08-31", time: "10:00", venue: "BURAM", home: "공릉", away: "청원" },
  { id: "F2", round: 1, order: 2, date: "2025-08-31", time: "11:00", venue: "BURAM", home: "새벽A", away: "상계" },
  { id: "F3", round: 1, order: 3, date: "2025-08-31", time: "12:00", venue: "BURAM", home: "대우", away: "노원" },
  { id: "F4", round: 1, order: 4, date: "2025-08-31", time: "13:00", venue: "BURAM", home: "상전", away: "새벽B" },
  { id: "F5", round: 3, order: 5, date: "2025-09-07", time: "14:00", venue: "MADEUL", home: { winnerOf: "F1" }, away: { winnerOf: "F2" } },
  { id: "F6", round: 3, order: 6, date: "2025-09-07", time: "15:30", venue: "MADEUL", home: { winnerOf: "F3" }, away: { winnerOf: "F4" } },
  { id: "F7", round: 4, order: 4, date: "2025-09-07", time: "11:00", venue: "MADEUL", home: { winnerOf: "F5" }, away: { winnerOf: "F6" } },
];

// 50대 노장부
const FIFTY_RAW: RawMatch[] = [
  { id: "O1", round: 1, order: 1, date: "2025-08-31", time: "10:00", venue: "CHOAN", home: "중원", away: "청원" },
  { id: "O2", round: 1, order: 2, date: "2025-08-31", time: "11:00", venue: "CHOAN", home: "상계", away: "한울" },
  { id: "O3", round: 2, order: 4, date: "2025-08-31", time: "13:00", venue: "CHOAN", home: { seed: 1 }, away: { winnerOf: "O1" } },
  { id: "O4", round: 2, order: 5, date: "2025-08-31", time: "14:00", venue: "CHOAN", home: { seed: 2 }, away: { winnerOf: "O2" } },
  { id: "O5", round: 3, order: 2, date: "2025-09-07", time: "09:00", venue: "YUKSA", home: { winnerOf: "O3" }, away: { winnerOf: "O4" } },
  { id: "O6", round: 3, order: 3, date: "2025-09-07", time: "10:00", venue: "YUKSA", home: { seed: 3 }, away: { seed: 4 } },
  { id: "O7", round: 4, order: 7, date: "2025-09-07", time: "16:00", venue: "MADEUL", home: { winnerOf: "O5" }, away: { winnerOf: "O6" } },
];

// 60대 실버부
const SIXTY_RAW: RawMatch[] = [
  { id: "S1", round: 1, order: 1, date: "2025-08-31", time: "10:00", venue: "SURAK", home: "노원", away: "JFC" },
  { id: "S2", round: 1, order: 2, date: "2025-08-31", time: "11:00", venue: "SURAK", home: "상전", away: "공릉" },
  { id: "S3", round: 3, order: 1, date: "2025-09-07", time: "08:00", venue: "MADEUL", home: { winnerOf: "S1" }, away: { winnerOf: "S2" } },
  { id: "S4", round: 3, order: 2, date: "2025-09-07", time: "08:00", venue: "YUKSA", home: { winnerOf: "S1" }, away: { winnerOf: "S2" } },
  { id: "S5", round: 4, order: 5, date: "2025-09-07", time: "12:00", venue: "MADEUL", home: { winnerOf: "S3" }, away: { winnerOf: "S4" } },
];

/**
 * 전체 대진표 데이터 생성
 */
export function generateRealBrackets(): Bracket[] {
  return [
    createBracket("youth", YOUTH_RAW),
    createBracket("middle", FORTY_RAW),
    createBracket("senior", FIFTY_RAW),
    createBracket("silver", SIXTY_RAW),
  ];
}

