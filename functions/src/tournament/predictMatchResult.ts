/**
 * 🔥 AI 경기 결과 예측 / 시뮬레이션
 * 
 * 경기 시작 전 예상 승률 및 스코어를 예측합니다.
 * 랭킹/파워지수 기반의 규칙 기반 모델 (비용 0, 설명 가능).
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";

interface MatchData {
  divisionNumber?: number;
  stage?: "quarter" | "semi" | "final";
  round?: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  status: "scheduled" | "completed";
  score?: {
    home: number;
    away: number;
  };
}

interface TeamRanking {
  teamId: string;
  rank: number;
  powerIndex: number;
  points: number;
  goalDiff: number;
  championships: number;
}

interface PredictionData {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: {
    home: number;
    away: number;
  };
  basedOn: {
    homePowerIndex: number;
    awayPowerIndex: number;
  };
  createdAt: any;
}

/**
 * 값을 min~max 범위로 제한
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 예측 계산 (단순 규칙 기반 모델)
 * 
 * powerDiff = homePowerIndex - awayPowerIndex
 * 
 * homeWinProb = clamp(0.5 + powerDiff * 0.05, 0.05, 0.9)
 * awayWinProb = clamp(0.5 - powerDiff * 0.05, 0.05, 0.9)
 * drawProb = 1 - (homeWinProb + awayWinProb)
 * 
 * 예상 스코어:
 * homeGoals = round(1.2 + powerDiff * 0.1)
 * awayGoals = round(1.2 - powerDiff * 0.1)
 */
function calculatePrediction(
  homePowerIndex: number,
  awayPowerIndex: number
): PredictionData {
  const powerDiff = homePowerIndex - awayPowerIndex;

  // 승률 계산
  const homeWinProbRaw = 0.5 + powerDiff * 0.05;
  const awayWinProbRaw = 0.5 - powerDiff * 0.05;

  const homeWinProb = clamp(homeWinProbRaw, 0.05, 0.9);
  const awayWinProb = clamp(awayWinProbRaw, 0.05, 0.9);
  const drawProb = Math.max(0, 1 - (homeWinProb + awayWinProb));

  // 확률 정규화 (합이 1이 되도록)
  const totalProb = homeWinProb + drawProb + awayWinProb;
  const normalizedHomeWinProb = homeWinProb / totalProb;
  const normalizedDrawProb = drawProb / totalProb;
  const normalizedAwayWinProb = awayWinProb / totalProb;

  // 예상 스코어 계산
  const homeGoals = Math.round(Math.max(0, 1.2 + powerDiff * 0.1));
  const awayGoals = Math.round(Math.max(0, 1.2 - powerDiff * 0.1));

  return {
    homeWinProb: Math.round(normalizedHomeWinProb * 1000) / 1000, // 소수점 3자리
    drawProb: Math.round(normalizedDrawProb * 1000) / 1000,
    awayWinProb: Math.round(normalizedAwayWinProb * 1000) / 1000,
    predictedScore: {
      home: homeGoals,
      away: awayGoals,
    },
    basedOn: {
      homePowerIndex: Math.round(homePowerIndex * 100) / 100,
      awayPowerIndex: Math.round(awayPowerIndex * 100) / 100,
    },
    createdAt: null, // 나중에 serverTimestamp로 설정
  };
}

/**
 * 경기 생성 시 결과 예측 트리거
 */
export const predictMatchResult = onDocumentCreated(
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
      const matchData = event.data?.data() as MatchData | undefined;

      // 삭제된 경우 또는 필수 정보 없음
      if (!matchData) {
        console.log(`[predictMatchResult] match ${matchId} 스킵: 데이터 없음`);
        return;
      }

      // 🔥 실행 조건 확인
      if (matchData.status !== "scheduled") {
        console.log(`[predictMatchResult] match ${matchId} 스킵: scheduled 상태 아님`);
        return;
      }

      if (!matchData.homeTeamId || !matchData.awayTeamId) {
        console.log(`[predictMatchResult] match ${matchId} 스킵: 팀 ID 누락`);
        return;
      }

      // prediction 이미 존재하는지 확인
      const predictionRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/prediction/prediction`
      );
      const predictionSnap = await predictionRef.get();
      
      if (predictionSnap.exists) {
        console.log(`[predictMatchResult] match ${matchId} prediction 이미 존재`);
        return;
      }

      console.log(`[predictMatchResult] 경기 예측 시작`, {
        matchId,
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
      });

      // 1️⃣ Tournament에서 seasonId 조회
      const tournamentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      const tournamentSnap = await tournamentRef.get();

      if (!tournamentSnap.exists) {
        console.log(`[predictMatchResult] tournament ${tournamentId} 존재하지 않음`);
        return;
      }

      const tournament = tournamentSnap.data() as any;
      const seasonId = tournament.seasonId;

      if (!seasonId) {
        console.log(`[predictMatchResult] tournament ${tournamentId} seasonId 없음 - 예측 스킵`);
        return;
      }

      // 🔥 Pro 플랜 체크 (AI 예측은 Pro 전용)
      const associationRef = db.doc(`associations/${associationId}`);
      const associationSnap = await associationRef.get();

      if (!associationSnap.exists) {
        console.log(`[predictMatchResult] association ${associationId} 존재하지 않음`);
        return;
      }

      const association = associationSnap.data();
      if (association?.plan !== "pro") {
        console.log(`[predictMatchResult] association ${associationId} free 플랜 - AI 예측 스킵`);
        return;
      }

      // 2️⃣ Rankings에서 powerIndex 조회
      const homeRankingRef = db.doc(
        `associations/${associationId}/rankings/${seasonId}/teams/${matchData.homeTeamId}`
      );
      const awayRankingRef = db.doc(
        `associations/${associationId}/rankings/${seasonId}/teams/${matchData.awayTeamId}`
      );

      const [homeRankingSnap, awayRankingSnap] = await Promise.all([
        homeRankingRef.get(),
        awayRankingRef.get(),
      ]);

      // 기본값 설정 (랭킹이 없으면 powerIndex = 0으로 가정)
      const homePowerIndex = homeRankingSnap.exists
        ? (homeRankingSnap.data() as TeamRanking).powerIndex || 0
        : 0;
      const awayPowerIndex = awayRankingSnap.exists
        ? (awayRankingSnap.data() as TeamRanking).powerIndex || 0
        : 0;

      console.log(`[predictMatchResult] 파워지수 조회`, {
        homeTeamId: matchData.homeTeamId,
        homePowerIndex,
        awayTeamId: matchData.awayTeamId,
        awayPowerIndex,
      });

      // 3️⃣ 예측 계산
      const prediction = calculatePrediction(homePowerIndex, awayPowerIndex);
      prediction.createdAt = admin.firestore.FieldValue.serverTimestamp();

      // 4️⃣ prediction 서브문서 write
      await predictionRef.set(prediction);

      // 5️⃣ 로그 기록
      const logsRef = db.collection(
        `associations/${associationId}/tournaments/${tournamentId}/logs`
      ).doc();

      await logsRef.set({
        type: "match_prediction",
        message: "경기 결과 예측 생성",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        by: "system",
        payload: {
          matchId: matchId,
          homeTeamId: matchData.homeTeamId,
          awayTeamId: matchData.awayTeamId,
          homeWinProb: prediction.homeWinProb,
          predictedScore: prediction.predictedScore,
        },
      });

      console.log(`[predictMatchResult] 경기 예측 완료`, {
        matchId,
        homeWinProb: prediction.homeWinProb,
        drawProb: prediction.drawProb,
        awayWinProb: prediction.awayWinProb,
        predictedScore: prediction.predictedScore,
      });

    } catch (error: any) {
      console.error(`[predictMatchResult] 에러 발생:`, {
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

