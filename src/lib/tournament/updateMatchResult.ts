/**
 * 경기 결과 입력 및 승자 자동 반영 로직
 */

import { doc, getDoc, updateDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Match } from "@/types/tournament";

interface MatchResult {
  matchId: string;
  scoreA: number;
  scoreB: number;
  resultType: "FT" | "PK" | "ET";
  winner: "HOME" | "AWAY";
}

/**
 * 경기 결과 입력 및 다음 경기 자동 갱신
 */
export async function updateMatchResult(
  associationId: string,
  tournamentId: string,
  division: string,
  result: MatchResult
): Promise<void> {
  const bracketRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/brackets/${division}`
  );

  await runTransaction(db, async (transaction) => {
    const bracketSnap = await transaction.get(bracketRef);
    if (!bracketSnap.exists()) {
      throw new Error("대진표를 찾을 수 없습니다.");
    }

    const bracket = bracketSnap.data();
    const matches: Match[] = bracket.matches || [];

    // 현재 경기 찾기 및 결과 업데이트
    const matchIndex = matches.findIndex((m) => m.id === result.matchId);
    if (matchIndex === -1) {
      throw new Error("경기를 찾을 수 없습니다.");
    }

    const currentMatch = matches[matchIndex];
    const winnerTeam =
      result.winner === "HOME"
        ? currentMatch.homeSlot?.teamName || currentMatch.teamA
        : currentMatch.awaySlot?.teamName || currentMatch.teamB;

    // 현재 경기 결과 업데이트
    matches[matchIndex] = {
      ...currentMatch,
      scoreA: result.winner === "HOME" ? result.scoreA : result.scoreB,
      scoreB: result.winner === "HOME" ? result.scoreB : result.scoreA,
      winner: result.winner,
      resultType: result.resultType,
      status: "completed",
    };

    // 다음 경기들 찾아서 승자 반영
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (match.status === "scheduled") {
        // 홈 슬롯이 현재 경기 승자를 참조하는 경우
        if (
          match.homeSlot?.type === "WINNER_OF_MATCH" &&
          match.homeSlot.refMatchId === result.matchId
        ) {
          matches[i] = {
            ...match,
            homeSlot: {
              type: "TEAM",
              teamName: winnerTeam,
            },
            teamA: winnerTeam,
          };
        }

        // 원정 슬롯이 현재 경기 승자를 참조하는 경우
        if (
          match.awaySlot?.type === "WINNER_OF_MATCH" &&
          match.awaySlot.refMatchId === result.matchId
        ) {
          matches[i] = {
            ...match,
            awaySlot: {
              type: "TEAM",
              teamName: winnerTeam,
            },
            teamB: winnerTeam,
          };
        }
      }
    }

    // 업데이트된 대진표 저장
    transaction.update(bracketRef, { matches });
  });
}

/**
 * 경기 결과 조회
 */
export async function getMatchResult(
  associationId: string,
  tournamentId: string,
  division: string,
  matchId: string
): Promise<Match | null> {
  const bracketRef = doc(
    db,
    `associations/${associationId}/tournaments/${tournamentId}/brackets/${division}`
  );

  const bracketSnap = await getDoc(bracketRef);
  if (!bracketSnap.exists()) {
    return null;
  }

  const bracket = bracketSnap.data();
  const matches: Match[] = bracket.matches || [];
  return matches.find((m) => m.id === matchId) || null;
}

