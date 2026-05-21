/**
 * 🔥 대회 결과 작성 시 랭킹 자동 계산 (STEP: 랭킹/통계 시스템)
 * 
 * 트리거: tournamentResults/{id} 생성/수정 시
 * 
 * 핵심 원칙:
 * - 랭킹은 집계된 데이터 (파생 컬렉션)
 * - 결과(tournamentResults)를 원본으로 두고 랭킹은 파생
 * - 실시간 필요 없음, 정확성과 일관성이 핵심
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";

interface TournamentResult {
  tournamentId: string;
  teamId: string;
  rank?: number;
  score?: number;
  resultText?: string;
  recordedAt: any;
}

interface TeamRanking {
  teamId: string;
  sport: string;
  season: string;
  totalPoints: number;
  totalMatches: number;
  wins: number;
  rank: number;
  updatedAt: any;
}

/**
 * 대회 결과 작성 시 해당 팀의 랭킹 재계산
 */
export const onTournamentResultWritten = onDocumentWritten(
  {
    region: "asia-northeast3",
    document: "tournamentResults/{resultId}",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const resultId = event.params.resultId as string;
    const resultAfter = event.data?.after?.data() as TournamentResult | undefined;

    // 삭제된 경우 스킵
    if (!resultAfter || !resultAfter.teamId || !resultAfter.tournamentId) {
      logger.info(`[onTournamentResultWritten] 결과 ${resultId} 스킵: 삭제됨`);
      return;
    }

    const { teamId, tournamentId } = resultAfter;

    try {
      logger.info(`[onTournamentResultWritten] 랭킹 재계산 시작`, {
        resultId,
        teamId,
        tournamentId,
      });

      // 1️⃣ 팀 정보 조회 (sport, season 파악)
      const teamRef = db.doc(`teams/${teamId}`);
      const teamSnap = await teamRef.get();

      if (!teamSnap.exists) {
        logger.warn(`[onTournamentResultWritten] 팀 ${teamId} 없음`);
        return;
      }

      const teamData = teamSnap.data();
      const sport = teamData?.sport || "기타";
      const currentYear = new Date().getFullYear();
      const season = currentYear.toString(); // 간단화: 현재 연도

      // 2️⃣ 해당 팀의 시즌 결과 전부 조회
      const resultsRef = db.collection("tournamentResults");
      const resultsSnap = await resultsRef
        .where("teamId", "==", teamId)
        .get();

      // 3️⃣ 점수 / 승리 수 집계
      let totalPoints = 0;
      let totalMatches = 0;
      let wins = 0;

      resultsSnap.docs.forEach((doc) => {
        const result = doc.data() as TournamentResult;
        totalMatches += 1;

        // rank 기반 승리 계산 (1위 = 승리)
        if (result.rank === 1) {
          wins += 1;
        }

        // score 기반 점수 집계
        if (result.score !== undefined) {
          totalPoints += result.score;
        } else if (result.rank !== undefined) {
          // rank 기반 점수 변환 (1위=10점, 2위=7점, 3위=5점 등)
          const rankPoints: Record<number, number> = {
            1: 10,
            2: 7,
            3: 5,
            4: 3,
          };
          totalPoints += rankPoints[result.rank] || 1;
        }
      });

      // 4️⃣ teamRankings 갱신 (upsert)
      const rankingRef = db
        .collection("teamRankings")
        .doc(`${teamId}_${sport}_${season}`);

      // 5️⃣ 전체 랭킹 재계산 (해당 sport/season의 모든 팀)
      const allRankingsRef = db.collection("teamRankings");
      const allRankingsSnap = await allRankingsRef
        .where("sport", "==", sport)
        .where("season", "==", season)
        .get();

      const rankings: TeamRanking[] = [];

      // 기존 랭킹 수집
      allRankingsSnap.docs.forEach((doc) => {
        const ranking = doc.data() as TeamRanking;
        if (ranking.teamId === teamId) {
          // 현재 팀은 새로 계산한 값으로 업데이트
          rankings.push({
            ...ranking,
            totalPoints,
            totalMatches,
            wins,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          rankings.push(ranking);
        }
      });

      // 현재 팀이 랭킹에 없으면 추가
      if (!rankings.find((r) => r.teamId === teamId)) {
        rankings.push({
          teamId,
          sport,
          season,
          totalPoints,
          totalMatches,
          wins,
          rank: 0, // 임시, 정렬 후 재부여
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 6️⃣ totalPoints 내림차순 정렬 후 rank 재부여
      rankings.sort((a, b) => {
        // 1순위: totalPoints (내림차순)
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        // 2순위: wins (내림차순)
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        // 3순위: totalMatches (내림차순)
        return b.totalMatches - a.totalMatches;
      });

      rankings.forEach((ranking, index) => {
        ranking.rank = index + 1;
      });

      // 7️⃣ 모든 랭킹 업데이트 (트랜잭션)
      await db.runTransaction(async (tx) => {
        rankings.forEach((ranking) => {
          const ref = db
            .collection("teamRankings")
            .doc(`${ranking.teamId}_${sport}_${season}`);
          tx.set(ref, ranking, { merge: true });
        });
      });

      logger.info(`[onTournamentResultWritten] 랭킹 업데이트 완료`, {
        teamId,
        sport,
        season,
        rank: rankings.find((r) => r.teamId === teamId)?.rank,
        totalPoints,
        totalMatches,
        wins,
      });
    } catch (error: any) {
      logger.error(`[onTournamentResultWritten] 에러 발생:`, {
        resultId,
        teamId,
        tournamentId,
        error: error.message,
        stack: error.stack,
      });
      // 트리거 에러는 로그만 남기고 throw하지 않음
    }
  }
);
