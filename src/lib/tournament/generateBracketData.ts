/**
 * 대진표 데이터 생성 유틸리티
 * 실제 대회 이미지 기준으로 match 데이터 생성
 */

import type { Match, Bracket, AgeDivision } from "@/types/tournament";
import type { VenueId } from "@/types/venue";

interface MatchInput {
  matchNumber: string;
  round: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  venueShort: string; // "마들", "육사" 등
  teamA?: string;
  teamB?: string;
  homeSlot?: {
    type: "TEAM" | "WINNER_OF_MATCH";
    teamName?: string;
    refMatchId?: string;
    refMatchNumber?: string;
  };
  awaySlot?: {
    type: "TEAM" | "WINNER_OF_MATCH";
    teamName?: string;
    refMatchId?: string;
    refMatchNumber?: string;
  };
  order?: number;
}

/**
 * venueShort를 VenueId로 변환
 */
function venueShortToId(short: string): VenueId | undefined {
  const map: Record<string, VenueId> = {
    마들: "MADEUL",
    육사: "YUKSA",
    수락산: "SURAK",
    초안산: "CHOAN",
    불암산: "BURAM",
  };
  return map[short];
}

/**
 * 단일 연령대 대진표 생성
 */
export function generateBracket(
  division: AgeDivision,
  matches: MatchInput[],
  confirmed: boolean = false
): Bracket {
  const bracketMatches: Match[] = matches.map((input, index) => {
    const venueId = venueShortToId(input.venueShort);

    return {
      id: `${division}-${input.matchNumber.replace(/[^0-9]/g, "")}`,
      matchNumber: input.matchNumber,
      division,
      round: input.round,
      order: input.order ?? index + 1,
      date: `${input.date}T00:00:00`,
      time: input.time,
      venueId: venueId,
      venue: input.venueShort, // 하위 호환성
      teamA: input.teamA,
      teamB: input.teamB,
      homeSlot: input.homeSlot
        ? {
            type: input.homeSlot.type,
            teamName: input.homeSlot.teamName,
            refMatchId: input.homeSlot.refMatchId,
            refMatchNumber: input.homeSlot.refMatchNumber,
          }
        : undefined,
      awaySlot: input.awaySlot
        ? {
            type: input.awaySlot.type,
            teamName: input.awaySlot.teamName,
            refMatchId: input.awaySlot.refMatchId,
            refMatchNumber: input.awaySlot.refMatchNumber,
          }
        : undefined,
      status: "scheduled" as const,
    };
  });

  return {
    division,
    matches: bracketMatches,
    confirmed,
  };
}

/**
 * 전체 대진표 데이터 생성 (샘플)
 * 실제 이미지 데이터를 받으면 이 함수를 업데이트
 */
export function generateSampleBrackets(): Bracket[] {
  // 샘플 데이터 (실제 이미지 기준으로 교체 필요)
  return [
    generateBracket(
      "youth",
      [
        {
          matchNumber: "1경기",
          round: "1회전",
          date: "2025-08-31",
          time: "09:00",
          venueShort: "수락산",
          teamA: "팀 A",
          teamB: "팀 B",
        },
        {
          matchNumber: "2경기",
          round: "1회전",
          date: "2025-08-31",
          time: "10:30",
          venueShort: "초안산",
          teamA: "팀 C",
          teamB: "팀 D",
        },
        {
          matchNumber: "3경기",
          round: "준결승",
          date: "2025-09-07",
          time: "09:00",
          venueShort: "마들",
          homeSlot: {
            type: "WINNER_OF_MATCH",
            refMatchId: "youth-1",
            refMatchNumber: "1경기 승자",
          },
          awaySlot: {
            type: "WINNER_OF_MATCH",
            refMatchId: "youth-2",
            refMatchNumber: "2경기 승자",
          },
        },
      ],
      true
    ),
  ];
}

