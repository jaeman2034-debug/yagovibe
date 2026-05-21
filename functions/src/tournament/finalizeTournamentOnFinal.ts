/**
 * 🔥 결승 종료 → 우승 확정 → 대회 기록 보존
 * 
 * 결승 경기 종료 시 우승 팀을 자동으로 확정하고 대회를 종료 상태로 전환합니다.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";

interface PlayoffMatchData {
  stage: "quarter" | "semi" | "final";
  round: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: "scheduled" | "completed";
  score?: {
    home: number;
    away: number;
  };
}

/**
 * 결승 경기 종료 시 우승 확정 트리거
 */
export const finalizeTournamentOnFinal = onDocumentWritten(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/tournaments/{tournamentId}/playoff/matches/{matchId}",
  },
  async (event) => {
    // 🔥 firebaseAdmin.ts에서 초기화된 admin 사용
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const associationId = event.params.associationId as string;
    const tournamentId = event.params.tournamentId as string;
    const matchId = event.params.matchId as string;

    try {
      // 변경된 match 문서 확인
      const matchDataAfter = event.data?.after?.data() as PlayoffMatchData | undefined;

      // 삭제된 경우 또는 final stage가 아닌 경우 스킵
      if (!matchDataAfter || matchDataAfter.stage !== "final") {
        console.log(`[finalizeTournament] match ${matchId} 스킵: final stage 아님 또는 삭제됨`);
        return;
      }

      // completed 상태이고 score가 있는 경우에만 처리
      if (matchDataAfter.status !== "completed" || !matchDataAfter.score) {
        console.log(`[finalizeTournament] match ${matchId} 스킵: completed 상태 아님 또는 score 없음`);
        return;
      }

      const tournamentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}`
      );

      // 트랜잭션으로 안전하게 처리
      await db.runTransaction(async (tx) => {
        // 1️⃣ Tournament 문서 확인
        const tSnap = await tx.get(tournamentRef);
        if (!tSnap.exists) {
          console.log(`[finalizeTournament] tournament ${tournamentId} 존재하지 않음`);
          return;
        }

        const tournament = tSnap.data() as any;

        // 🔥 중복 실행 방지
        if (tournament.status === "completed") {
          console.log(`[finalizeTournament] tournament ${tournamentId} 이미 종료됨`);
          return;
        }

        if (tournament.champion?.teamId) {
          console.log(`[finalizeTournament] tournament ${tournamentId} 우승팀 이미 확정됨`);
          return;
        }

        // 2️⃣ 우승 판정
        const { home: homeScore, away: awayScore } = matchDataAfter.score!;
        const homeTeamId = matchDataAfter.homeTeamId;
        const awayTeamId = matchDataAfter.awayTeamId;

        if (!homeTeamId || !awayTeamId) {
          console.error(`[finalizeTournament] match ${matchId} 팀 ID 누락`);
          return;
        }

        // 우승 팀 판정 (무승부 없음 - 연장/PK는 프론트에서 처리 후 score 반영)
        const winnerTeamId = homeScore > awayScore ? homeTeamId : awayTeamId;

        console.log(`[finalizeTournament] 우승팀 확정`, {
          matchId,
          homeTeam: homeTeamId,
          awayTeam: awayTeamId,
          score: `${homeScore}:${awayScore}`,
          winner: winnerTeamId,
        });

        const now = admin.firestore.FieldValue.serverTimestamp();

        // 3️⃣ Tournament 업데이트
        tx.update(tournamentRef, {
          status: "completed",
          champion: {
            teamId: winnerTeamId,
            decidedAt: now,
            matchId: matchId,
          },
          completedAt: now,
        });

        // 4️⃣ 히스토리 저장 (기록 보존)
        const historyRef = db.collection(
          `associations/${associationId}/tournamentHistory`
        ).doc();

        // 대회 요약 정보 수집
        const totalTeams = tournament.totalTeams || 0;
        const totalMatches = tournament.totalMatches || 0;

        tx.set(historyRef, {
          tournamentId: tournamentId,
          championTeamId: winnerTeamId,
          finishedAt: now,
          summary: {
            totalTeams: totalTeams,
            totalMatches: totalMatches,
            format: "group + playoff",
          },
          // 추가 정보 보존
          tournamentName: tournament.name,
          tournamentStartDate: tournament.startDate,
          tournamentEndDate: tournament.endDate,
        });

        // 5️⃣ 로그 기록
        const logsRef = db.collection(
          `associations/${associationId}/tournaments/${tournamentId}/logs`
        ).doc();

        tx.set(logsRef, {
          type: "tournament_complete",
          message: "대회 종료 및 우승팀 확정",
          createdAt: now,
          by: "system", // 시스템 자동 실행
          payload: {
            championTeamId: winnerTeamId,
            matchId: matchId,
            score: `${homeScore}:${awayScore}`,
          },
        });

        console.log(`[finalizeTournament] 대회 종료 처리 완료`, {
          tournamentId,
          winnerTeamId,
          historyId: historyRef.id,
        });
      });

    } catch (error: any) {
      console.error(`[finalizeTournament] 에러 발생:`, {
        associationId,
        tournamentId,
        matchId,
        error: error.message,
        stack: error.stack,
      });
      // 트리거 에러는 로그만 남기고 throw하지 않음
    }
  }
);

