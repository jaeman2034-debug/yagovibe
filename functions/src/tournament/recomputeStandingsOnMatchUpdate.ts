/**
 * 🔥 순위표(Standings) 자동 계산
 * 
 * 경기 결과 입력 시 조별 순위표를 자동으로 계산하여 standings 컬렉션에 저장합니다.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";

interface MatchData {
  divisionNumber: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: "scheduled" | "completed";
  score?: {
    home: number;
    away: number;
  };
}

interface TeamStats {
  teamId: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

/**
 * 순위표 자동 계산 트리거
 * 
 * match 문서가 작성/수정될 때마다 해당 조의 순위표를 재계산합니다.
 */
export const recomputeStandingsOnMatchUpdate = onDocumentWritten(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}",
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
      const matchDataAfter = event.data?.after?.data() as MatchData | undefined;
      const matchDataBefore = event.data?.before?.data() as MatchData | undefined;

      // 삭제된 경우 또는 divisionNumber가 없는 경우 스킵
      if (!matchDataAfter || !matchDataAfter.divisionNumber) {
        console.log(`[recomputeStandings] match ${matchId} 스킵: divisionNumber 없음 또는 삭제됨`);
        return;
      }

      // completed 상태이고 score가 있는 경우에만 재계산
      if (matchDataAfter.status !== "completed" || !matchDataAfter.score) {
        // 이전 상태가 completed였다가 다른 상태로 변경된 경우 재계산 필요
        if (matchDataBefore?.status === "completed" && matchDataBefore?.score) {
          // 재계산 진행 (점수 변경 또는 취소된 경우)
        } else {
          console.log(`[recomputeStandings] match ${matchId} 스킵: completed 상태 아님 또는 score 없음`);
          return;
        }
      }

      const divisionNumber = matchDataAfter.divisionNumber;

      console.log(`[recomputeStandings] 조 ${divisionNumber} 순위표 재계산 시작`, {
        matchId,
        divisionNumber,
        status: matchDataAfter.status,
      });

      // 같은 조의 모든 completed matches 조회
      const matchesRef = db.collection(
        `associations/${associationId}/tournaments/${tournamentId}/matches`
      );
      const matchesQuery = matchesRef
        .where("divisionNumber", "==", divisionNumber)
        .where("status", "==", "completed");
      
      const matchesSnap = await matchesQuery.get();

      // 팀별 스탯 초기화
      const teamStatsMap = new Map<string, TeamStats>();

      // 모든 completed matches에서 스탯 누적 (score가 있는 것만)
      matchesSnap.docs.forEach((doc) => {
        const match = doc.data() as MatchData;
        if (!match.score || !match.homeTeamId || !match.awayTeamId) return;

        const { home: homeScore, away: awayScore } = match.score;

        // 홈팀 스탯 업데이트
        const homeStats = teamStatsMap.get(match.homeTeamId) || {
          teamId: match.homeTeamId,
          played: 0,
          win: 0,
          draw: 0,
          loss: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
        };
        homeStats.played++;
        homeStats.goalsFor += homeScore;
        homeStats.goalsAgainst += awayScore;
        homeStats.goalDiff = homeStats.goalsFor - homeStats.goalsAgainst;
        if (homeScore > awayScore) {
          homeStats.win++;
          homeStats.points += 3;
        } else if (homeScore === awayScore) {
          homeStats.draw++;
          homeStats.points += 1;
        } else {
          homeStats.loss++;
        }
        teamStatsMap.set(match.homeTeamId, homeStats);

        // 어웨이팀 스탯 업데이트
        const awayStats = teamStatsMap.get(match.awayTeamId) || {
          teamId: match.awayTeamId,
          played: 0,
          win: 0,
          draw: 0,
          loss: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
        };
        awayStats.played++;
        awayStats.goalsFor += awayScore;
        awayStats.goalsAgainst += homeScore;
        awayStats.goalDiff = awayStats.goalsFor - awayStats.goalsAgainst;
        if (awayScore > homeScore) {
          awayStats.win++;
          awayStats.points += 3;
        } else if (awayScore === homeScore) {
          awayStats.draw++;
          awayStats.points += 1;
        } else {
          awayStats.loss++;
        }
        teamStatsMap.set(match.awayTeamId, awayStats);
      });

      // 스탯 배열로 변환
      const table: TeamStats[] = Array.from(teamStatsMap.values());

      // 정렬 규칙 적용
      table.sort((a, b) => {
        // 1순위: points (내림차순)
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        // 2순위: goalDiff (득실차, 내림차순)
        if (b.goalDiff !== a.goalDiff) {
          return b.goalDiff - a.goalDiff;
        }
        // 3순위: goalsFor (다득점, 내림차순)
        if (b.goalsFor !== a.goalsFor) {
          return b.goalsFor - a.goalsFor;
        }
        // 4순위: played (경기 수 적은 팀 우선, 오름차순)
        return a.played - b.played;
      });

      // standings 문서 업데이트
      const standingsRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/standings/div${divisionNumber}`
      );

      await standingsRef.set({
        divisionNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        table,
      }, { merge: true });

      console.log(`[recomputeStandings] 조 ${divisionNumber} 순위표 업데이트 완료`, {
        divisionNumber,
        teamCount: table.length,
        topTeam: table[0] ? { teamId: table[0].teamId, points: table[0].points } : null,
      });

    } catch (error: any) {
      console.error(`[recomputeStandings] 에러 발생:`, {
        associationId,
        tournamentId,
        matchId,
        error: error.message,
        stack: error.stack,
      });
      // 트리거 에러는 로그만 남기고 throw하지 않음 (다른 match 처리에 영향 방지)
    }
  }
);

