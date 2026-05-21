/**
 * 🔥 랭킹 시스템 / 파워지수 산출
 * 
 * 시즌/전체 기준 팀 랭킹을 자동으로 산출하여 파워지수를 계산합니다.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";

interface SeasonStatsData {
  seasonId: string;
  tournaments: number;
  championships: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  updatedAt: any;
}

interface TeamRanking {
  teamId: string;
  rank: number;
  powerIndex: number;
  points: number;
  goalDiff: number;
  championships: number;
  updatedAt: any;
}

/**
 * 파워지수 계산 공식 (확정 · 변경 금지)
 * 
 * powerIndex = points * 1.0 + goalDiff * 0.3 + championships * 5
 * points = win * 3 + draw * 1
 */
function calculatePowerIndex(
  wins: number,
  draws: number,
  goalDiff: number,
  championships: number
): number {
  const points = wins * 3 + draws * 1;
  const powerIndex = points * 1.0 + goalDiff * 0.3 + championships * 5;
  return Math.round(powerIndex * 100) / 100; // 소수점 2자리
}

/**
 * 시즌 통계 변경 시 랭킹 재계산 트리거
 */
export const recomputeRankingsOnSeasonStats = onDocumentWritten(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/teams/{teamId}/seasonStats/{seasonId}",
  },
  async (event) => {
    // 🔥 firebaseAdmin.ts에서 초기화된 admin 사용
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const associationId = event.params.associationId as string;
    const teamId = event.params.teamId as string;
    const seasonId = event.params.seasonId as string;

    try {
      // 변경된 seasonStats 문서 확인
      const seasonStatsAfter = event.data?.after?.data() as SeasonStatsData | undefined;

      // 삭제된 경우 스킵
      if (!seasonStatsAfter || !seasonStatsAfter.seasonId) {
        console.log(`[recomputeRankings] seasonStats ${seasonId} 스킵: 삭제됨`);
        return;
      }

      console.log(`[recomputeRankings] 시즌 랭킹 재계산 시작`, {
        associationId,
        seasonId,
        teamId,
      });

      // 트랜잭션으로 안전하게 처리
      await db.runTransaction(async (tx) => {
        // 1️⃣ 해당 seasonId의 모든 team seasonStats 조회
        const teamsRef = db.collection(`associations/${associationId}/teams`);
        const teamsSnap = await tx.get(teamsRef);

        const teamRankings: TeamRanking[] = [];

        // 각 팀의 seasonStats 확인
        for (const teamDoc of teamsSnap.docs) {
          const currentTeamId = teamDoc.id;
          const seasonStatsRef = db.doc(
            `associations/${associationId}/teams/${currentTeamId}/seasonStats/${seasonId}`
          );
          const seasonStatsSnap = await tx.get(seasonStatsRef);

          if (!seasonStatsSnap.exists) {
            continue; // 해당 시즌 데이터가 없는 팀은 제외
          }

          const stats = seasonStatsSnap.data() as SeasonStatsData;

          // 2️⃣ 각 팀에 대해 계산
          const points = stats.wins * 3 + stats.draws * 1;
          const goalDiff = stats.goalsFor - stats.goalsAgainst;
          const powerIndex = calculatePowerIndex(
            stats.wins,
            stats.draws,
            goalDiff,
            stats.championships || 0
          );

          teamRankings.push({
            teamId: currentTeamId,
            rank: 0, // 임시, 정렬 후 재부여
            powerIndex,
            points,
            goalDiff,
            championships: stats.championships || 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        if (teamRankings.length === 0) {
          console.log(`[recomputeRankings] 시즌 ${seasonId} 참가 팀 없음`);
          return;
        }

        // 3️⃣ powerIndex 내림차순 정렬
        teamRankings.sort((a, b) => {
          // 1순위: powerIndex (내림차순)
          if (b.powerIndex !== a.powerIndex) {
            return b.powerIndex - a.powerIndex;
          }
          // 2순위: points (내림차순)
          if (b.points !== a.points) {
            return b.points - a.points;
          }
          // 3순위: goalDiff (내림차순)
          if (b.goalDiff !== a.goalDiff) {
            return b.goalDiff - a.goalDiff;
          }
          // 4순위: championships (내림차순)
          return b.championships - a.championships;
        });

        // 4️⃣ rank 재부여
        teamRankings.forEach((ranking, index) => {
          ranking.rank = index + 1;
        });

        // 5️⃣ rankings/{seasonId}/teams write
        const rankingsRef = db.collection(
          `associations/${associationId}/rankings/${seasonId}/teams`
        );

        // 기존 랭킹 삭제 (overwrite 허용)
        const existingRankingsSnap = await tx.get(rankingsRef);
        existingRankingsSnap.docs.forEach((doc) => {
          tx.delete(doc.ref);
        });

        // 새 랭킹 작성
        teamRankings.forEach((ranking) => {
          const teamRankingRef = rankingsRef.doc(ranking.teamId);
          tx.set(teamRankingRef, {
            teamId: ranking.teamId,
            rank: ranking.rank,
            powerIndex: ranking.powerIndex,
            points: ranking.points,
            goalDiff: ranking.goalDiff,
            championships: ranking.championships,
            updatedAt: ranking.updatedAt,
          });
        });

        // 6️⃣ 로그 기록 (첫 번째 팀의 시즌 통계 변경만 로그 기록)
        if (teamId === teamRankings[0]?.teamId) {
          const logsRef = db.collection(`associations/${associationId}/logs`).doc();
          tx.set(logsRef, {
            type: "ranking_update",
            message: "시즌 랭킹 업데이트 완료",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            by: "system",
            payload: {
              seasonId: seasonId,
              teamCount: teamRankings.length,
              topTeam: teamRankings[0] ? {
                teamId: teamRankings[0].teamId,
                rank: teamRankings[0].rank,
                powerIndex: teamRankings[0].powerIndex,
              } : null,
            },
          });
        }

        console.log(`[recomputeRankings] 시즌 랭킹 업데이트 완료`, {
          seasonId,
          teamCount: teamRankings.length,
          topTeam: teamRankings[0] ? {
            teamId: teamRankings[0].teamId,
            rank: teamRankings[0].rank,
            powerIndex: teamRankings[0].powerIndex,
          } : null,
        });
      });

    } catch (error: any) {
      console.error(`[recomputeRankings] 에러 발생:`, {
        associationId,
        teamId,
        seasonId,
        error: error.message,
        stack: error.stack,
      });
      // 트리거 에러는 로그만 남기고 throw하지 않음
    }
  }
);

