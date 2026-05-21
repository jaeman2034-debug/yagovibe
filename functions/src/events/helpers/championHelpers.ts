/**
 * 🔥 Champion / Runner-Up 자동 생성 헬퍼
 * 
 * 역할:
 * - 최종전 완료 시 champion/runner-up 자동 생성
 * - Event 문서 업데이트
 * - 중복 실행 방지
 */

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

const db = getFirestore();

/**
 * 최종전 여부 판단
 * 
 * 판단 기준:
 * 1. roundCode === "F" 또는 roundName === "결승"
 * 2. stageType === "knockout"
 * 3. nextMatchId가 없음 (다음 경기가 없음)
 */
export function isFinalMatch(match: {
  roundCode?: string;
  roundName?: string;
  stageType?: string;
  nextMatchId?: string | null;
}): boolean {
  // roundCode로 판단
  if (match.roundCode === "F" || match.roundCode === "FINAL") {
    return true;
  }

  // roundName으로 판단
  if (match.roundName === "결승" || match.roundName?.includes("결승")) {
    return true;
  }

  // knockout 스테이지이고 다음 경기가 없으면 결승으로 간주
  if (match.stageType === "knockout" && !match.nextMatchId) {
    return true;
  }

  return false;
}

/**
 * Champion / Runner-Up 자동 생성
 * 
 * 조건:
 * - 최종전 완료 시에만 실행
 * - Event 문서에 champion/runnerUp 필드 업데이트
 * - 중복 실행 방지 (이미 champion이 있으면 스킵)
 */
export async function finalizeEventChampion(
  eventId: string,
  matchId: string,
  homeTeamId: string,
  homeTeamName: string,
  awayTeamId: string,
  awayTeamName: string,
  homeScore: number,
  awayScore: number,
  divisionId?: string | null
): Promise<void> {
  try {
    const eventRef = db.doc(`events/${eventId}`);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      logger.warn("⚠️ [finalizeEventChampion] Event 문서 없음:", { eventId });
      return;
    }

    const eventData = eventSnap.data();
    
    // 🔥 중복 실행 방지
    if (eventData?.champion?.teamId) {
      logger.info("ℹ️ [finalizeEventChampion] 이미 champion 확정됨:", {
        eventId,
        existingChampion: eventData.champion.teamId,
      });
      return;
    }

    // 🔥 우승/준우승 판정
    const winnerTeamId = homeScore > awayScore ? homeTeamId : awayTeamId;
    const winnerTeamName = homeScore > awayScore ? homeTeamName : awayTeamName;
    const runnerUpTeamId = homeScore > awayScore ? awayTeamId : homeTeamId;
    const runnerUpTeamName = homeScore > awayScore ? awayTeamName : homeTeamName;

    const now = admin.firestore.Timestamp.now();

    // 🔥 Event 문서 업데이트 + event_awards 생성 (트랜잭션으로 안전하게)
    await db.runTransaction(async (tx) => {
      const eventSnapInTx = await tx.get(eventRef);
      
      if (!eventSnapInTx.exists) {
        throw new Error(`Event ${eventId} not found`);
      }

      const eventDataInTx = eventSnapInTx.data()!;
      
      // 중복 실행 방지 (트랜잭션 내에서 재확인)
      if (eventDataInTx.champion?.teamId) {
        logger.info("ℹ️ [finalizeEventChampion] 트랜잭션 내에서 이미 champion 확정됨");
        return;
      }

      // divisionId 우선순위: 매개변수 > Event 문서
      const finalDivisionId = divisionId || eventDataInTx.divisionId || null;

      // 🔥 event_awards 컬렉션에 Champion/Runner-up 생성
      const awardsRef = db.collection("event_awards");
      const championAwardRef = awardsRef.doc();
      const runnerUpAwardRef = awardsRef.doc();

      tx.set(championAwardRef, {
        eventId: eventId,
        divisionId: finalDivisionId,
        awardType: "champion",
        teamId: winnerTeamId,
        teamName: winnerTeamName,
        matchId: matchId,
        createdAt: now,
      });

      tx.set(runnerUpAwardRef, {
        eventId: eventId,
        divisionId: finalDivisionId,
        awardType: "runner_up",
        teamId: runnerUpTeamId,
        teamName: runnerUpTeamName,
        matchId: matchId,
        createdAt: now,
      });

      // Champion / Runner-Up 업데이트 (Event 문서)
      tx.update(eventRef, {
        champion: {
          teamId: winnerTeamId,
          teamName: winnerTeamName,
          matchId: matchId,
          decidedAt: now,
        },
        runnerUp: {
          teamId: runnerUpTeamId,
          teamName: runnerUpTeamName,
          matchId: matchId,
          decidedAt: now,
        },
        status: "completed", // Event 상태도 완료로 변경
        updatedAt: now,
      });
    });

    logger.info("✅ [finalizeEventChampion] Champion/Runner-Up 확정 완료:", {
      eventId,
      matchId,
      champion: winnerTeamId,
      runnerUp: runnerUpTeamId,
      score: `${homeScore}:${awayScore}`,
    });
  } catch (error: any) {
    logger.error("❌ [finalizeEventChampion] 처리 실패:", {
      eventId,
      matchId,
      error: error.message,
      stack: error.stack,
    });
    // 에러 발생해도 경기 기록은 유지 (에러를 throw하지 않음)
  }
}
