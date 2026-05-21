/**
 * 대진표 데이터 시드 스크립트
 * Firestore에 대진표 데이터 저장
 */

import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Bracket } from "@/types/tournament";
import { generateBracket } from "./generateBracketData";

/**
 * 대진표 데이터를 Firestore에 저장
 */
export async function seedBracketData(
  associationId: string,
  tournamentId: string,
  brackets: Bracket[]
): Promise<void> {
  for (const bracket of brackets) {
    const bracketRef = doc(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/brackets/${bracket.division}`
    );

    await setDoc(bracketRef, bracket, { merge: true });
  }
}

/**
 * 실제 대회 이미지 기준 대진표 데이터 생성 예시
 * 사용자가 제공한 팀 리스트를 기반으로 실제 데이터 생성
 */
export function createRealBracketData(
  division: AgeDivision,
  teams: string[],
  schedule: Array<{
    matchNumber: string;
    round: string;
    date: string;
    time: string;
    venueShort: string;
    teamA?: string;
    teamB?: string;
    homeSlot?: { type: "WINNER_OF_MATCH"; refMatchId: string; refMatchNumber: string };
    awaySlot?: { type: "WINNER_OF_MATCH"; refMatchId: string; refMatchNumber: string };
  }>
): Bracket {
  return generateBracket(
    division,
    schedule.map((s) => ({
      ...s,
      teamA: s.teamA,
      teamB: s.teamB,
      homeSlot: s.homeSlot,
      awaySlot: s.awaySlot,
    })),
    true
  );
}

