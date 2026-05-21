/**
 * 🔥 시즌 통계 / 팀 히스토리 누적
 * 
 * 대회 종료 시 팀별 누적 기록을 자동으로 업데이트하여 시즌/전체 통계를 유지합니다.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";

interface MatchData {
  divisionNumber?: number;
  stage?: "quarter" | "semi" | "final";
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: "scheduled" | "completed";
  score?: {
    home: number;
    away: number;
  };
}

interface TeamMatchStats {
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface TournamentData {
  status: string;
  champion?: {
    teamId: string;
    decidedAt: any;
    matchId: string;
  };
  seasonId?: string | null;
  name?: string;
}

/**
 * 대회 종료 시 팀 히스토리 및 시즌 통계 업데이트 트리거
 */
export const updateTeamSeasonStats = onDocumentUpdated(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/tournaments/{tournamentId}",
  },
  async (event) => {
    // 🔥 firebaseAdmin.ts에서 초기화된 admin 사용
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const associationId = event.params.associationId as string;
    const tournamentId = event.params.tournamentId as string;

    try {
      const beforeData = event.data?.before?.data() as TournamentData | undefined;
      const afterData = event.data?.after?.data() as TournamentData | undefined;

      // status가 "completed"로 변경되었는지 확인
      if (!afterData || afterData.status !== "completed") {
        console.log(`[updateTeamSeasonStats] tournament ${tournamentId} status가 completed 아님`);
        return;
      }

      // 이전 상태가 이미 completed였으면 스킵 (중복 실행 방지)
      if (beforeData?.status === "completed") {
        console.log(`[updateTeamSeasonStats] tournament ${tournamentId} 이미 처리됨`);
        return;
      }

      // champion.teamId 존재 확인
      if (!afterData.champion?.teamId) {
        console.log(`[updateTeamSeasonStats] tournament ${tournamentId} 우승팀 정보 없음`);
        return;
      }

      const championTeamId = afterData.champion.teamId;
      const seasonId = afterData.seasonId || null;
      const tournamentName = afterData.name || "대회";

      console.log(`[updateTeamSeasonStats] 대회 종료 처리 시작`, {
        tournamentId,
        championTeamId,
        seasonId,
      });

      // 트랜잭션으로 안전하게 처리
      await db.runTransaction(async (tx) => {
        // 1️⃣ 참가 팀 목록 조회 (divisions에서 추출)
        const divisionsRef = db.collection(
          `associations/${associationId}/tournaments/${tournamentId}/divisions`
        );
        const divisionsSnap = await tx.get(divisionsRef);

        const teamIdsSet = new Set<string>();
        divisionsSnap.docs.forEach((doc) => {
          const div = doc.data();
          const teamIds = div.teamIds || [];
          teamIds.forEach((tid: string) => teamIdsSet.add(tid));
        });

        if (teamIdsSet.size === 0) {
          console.log(`[updateTeamSeasonStats] 참가 팀 없음`);
          return;
        }

        // 2️⃣ 모든 matches 조회 (조별 + 플레이오프)
        const matchesRef = db.collection(
          `associations/${associationId}/tournaments/${tournamentId}/matches`
        );
        const playoffMatchesRef = db.collection(
          `associations/${associationId}/tournaments/${tournamentId}/playoff/matches`
        );

        const [matchesSnap, playoffMatchesSnap] = await Promise.all([
          tx.get(matchesRef),
          tx.get(playoffMatchesRef),
        ]);

        // 3️⃣ 팀별 경기 스탯 집계
        const teamStatsMap = new Map<string, TeamMatchStats>();

        // 조별 리그 matches 처리
        matchesSnap.docs.forEach((doc) => {
          const match = doc.data() as MatchData;
          if (match.status !== "completed" || !match.score || !match.homeTeamId || !match.awayTeamId) {
            return;
          }

          const { home: homeScore, away: awayScore } = match.score;

          // 홈팀 스탯
          const homeStats = teamStatsMap.get(match.homeTeamId) || {
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          };
          homeStats.played++;
          homeStats.goalsFor += homeScore;
          homeStats.goalsAgainst += awayScore;
          if (homeScore > awayScore) homeStats.win++;
          else if (homeScore === awayScore) homeStats.draw++;
          else homeStats.loss++;
          teamStatsMap.set(match.homeTeamId, homeStats);

          // 어웨이팀 스탯
          const awayStats = teamStatsMap.get(match.awayTeamId) || {
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          };
          awayStats.played++;
          awayStats.goalsFor += awayScore;
          awayStats.goalsAgainst += homeScore;
          if (awayScore > homeScore) awayStats.win++;
          else if (awayScore === homeScore) awayStats.draw++;
          else awayStats.loss++;
          teamStatsMap.set(match.awayTeamId, awayStats);
        });

        // 플레이오프 matches 처리
        playoffMatchesSnap.docs.forEach((doc) => {
          const match = doc.data() as MatchData;
          if (match.status !== "completed" || !match.score || !match.homeTeamId || !match.awayTeamId) {
            return;
          }

          const { home: homeScore, away: awayScore } = match.score;

          // 홈팀 스탯
          const homeStats = teamStatsMap.get(match.homeTeamId) || {
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          };
          homeStats.played++;
          homeStats.goalsFor += homeScore;
          homeStats.goalsAgainst += awayScore;
          if (homeScore > awayScore) homeStats.win++;
          else if (homeScore === awayScore) homeStats.draw++;
          else homeStats.loss++;
          teamStatsMap.set(match.homeTeamId, homeStats);

          // 어웨이팀 스탯
          const awayStats = teamStatsMap.get(match.awayTeamId) || {
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          };
          awayStats.played++;
          awayStats.goalsFor += awayScore;
          awayStats.goalsAgainst += homeScore;
          if (awayScore > homeScore) awayStats.win++;
          else if (awayScore === homeScore) awayStats.draw++;
          else awayStats.loss++;
          teamStatsMap.set(match.awayTeamId, awayStats);
        });

        // 4️⃣ 우승 팀 finalPosition 결정 (1위)
        // 준우승 팀 찾기 (final match에서 패배한 팀)
        let runnerUpTeamId: string | null = null;
        playoffMatchesSnap.docs.forEach((doc) => {
          const match = doc.data() as MatchData;
          if (match.stage === "final" && match.status === "completed" && match.score) {
            const { home: homeScore, away: awayScore } = match.score;
            if (homeScore > awayScore) {
              runnerUpTeamId = match.awayTeamId;
            } else if (awayScore > homeScore) {
              runnerUpTeamId = match.homeTeamId;
            }
          }
        });

        // 5️⃣ 각 팀에 history 생성 및 seasonStats 업데이트
        const now = admin.firestore.FieldValue.serverTimestamp();

        for (const teamId of teamIdsSet) {
          const stats = teamStatsMap.get(teamId) || {
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          };

          // finalPosition 결정
          let finalPosition: number | null = null;
          if (teamId === championTeamId) {
            finalPosition = 1; // 우승
          } else if (teamId === runnerUpTeamId) {
            finalPosition = 2; // 준우승
          }
          // 3위 이하는 standings에서 확인 가능하지만, 여기서는 1, 2위만 기록

          // history/{tournamentId} 생성 (중복 방지)
          const historyRef = db.doc(
            `associations/${associationId}/teams/${teamId}/history/${tournamentId}`
          );
          const historySnap = await tx.get(historyRef);

          if (!historySnap.exists) {
            tx.set(historyRef, {
              tournamentId: tournamentId,
              seasonId: seasonId,
              participatedAt: now,
              finalPosition: finalPosition,
              stats: stats,
            });
          }

          // seasonStats/{seasonId} 누적 업데이트 (시즌이 있는 경우만)
          if (seasonId) {
            const seasonStatsRef = db.doc(
              `associations/${associationId}/teams/${teamId}/seasonStats/${seasonId}`
            );
            const seasonStatsSnap = await tx.get(seasonStatsRef);

            if (seasonStatsSnap.exists) {
              const current = seasonStatsSnap.data();
              tx.update(seasonStatsRef, {
                tournaments: (current?.tournaments || 0) + 1,
                championships: (current?.championships || 0) + (teamId === championTeamId ? 1 : 0),
                wins: (current?.wins || 0) + stats.win,
                draws: (current?.draws || 0) + stats.draw,
                losses: (current?.losses || 0) + stats.loss,
                goalsFor: (current?.goalsFor || 0) + stats.goalsFor,
                goalsAgainst: (current?.goalsAgainst || 0) + stats.goalsAgainst,
                updatedAt: now,
              });
            } else {
              tx.set(seasonStatsRef, {
                seasonId: seasonId,
                tournaments: 1,
                championships: teamId === championTeamId ? 1 : 0,
                wins: stats.win,
                draws: stats.draw,
                losses: stats.loss,
                goalsFor: stats.goalsFor,
                goalsAgainst: stats.goalsAgainst,
                updatedAt: now,
              });
            }
          }
        }

        // 6️⃣ 로그 기록
        const logsRef = db.collection(
          `associations/${associationId}/tournaments/${tournamentId}/logs`
        ).doc();

        tx.set(logsRef, {
          type: "season_stats_update",
          message: "팀 시즌 통계 업데이트 완료",
          createdAt: now,
          by: "system",
          payload: {
            tournamentId: tournamentId,
            teamCount: teamIdsSet.size,
            championTeamId: championTeamId,
          },
        });

        console.log(`[updateTeamSeasonStats] 팀 시즌 통계 업데이트 완료`, {
          tournamentId,
          teamCount: teamIdsSet.size,
          championTeamId,
          seasonId,
        });
      });

    } catch (error: any) {
      console.error(`[updateTeamSeasonStats] 에러 발생:`, {
        associationId,
        tournamentId,
        error: error.message,
        stack: error.stack,
      });
      // 트리거 에러는 로그만 남기고 throw하지 않음
    }
  }
);

