/**
 * 🔥 STEP 7: 경기 결과 입력 Callable
 * 
 * 기능:
 * - 경기 결과 입력 (관리자 전용)
 * - 조별 리그: 순위표 자동 재계산
 * - 토너먼트: 승자 자동 진출
 * - FINAL+ 단계: 감사 로그 저장
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = admin.firestore();

interface SubmitMatchResultRequest {
  associationId: string;
  tournamentId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
}

/**
 * 🔥 경기 결과 입력 (관리자 전용)
 */
export const submitMatchResultCallable = functions
  .region("asia-northeast3")
  .https.onCall(async (data: SubmitMatchResultRequest, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId, matchId, homeScore, awayScore } = data;
    const uid = context.auth.uid;

    // 🔥 입력 검증
    if (!associationId || !tournamentId || !matchId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    if (typeof homeScore !== "number" || typeof awayScore !== "number") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "점수는 숫자여야 합니다."
      );
    }

    if (homeScore < 0 || awayScore < 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "점수는 0 이상이어야 합니다."
      );
    }

    logger.info(`[submitMatchResult] 시작`, {
      associationId,
      tournamentId,
      matchId,
      homeScore,
      awayScore,
      uid,
    });

    try {
      // 🔥 1. 관리자 권한 체크
      const associationRef = db.doc(`associations/${associationId}`);
      const associationSnap = await associationRef.get();

      if (!associationSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "협회를 찾을 수 없습니다."
        );
      }

      const associationData = associationSnap.data()!;
      const adminUids = associationData.adminUids || {};

      if (!adminUids[uid]) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "협회 관리자만 경기 결과를 입력할 수 있습니다."
        );
      }

      // 🔥 2. 대회 정보 조회 및 Phase 체크
      const tournamentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      const tournamentSnap = await tournamentRef.get();

      if (!tournamentSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "대회를 찾을 수 없습니다."
        );
      }

      const tournament = tournamentSnap.data()!;
      const currentPhase = tournament.tournamentPhase;

      // 🔥 경기 결과 입력 가능 Phase: MATCHES_RUNNING 또는 DRAW_DONE 이후
      const allowedPhases = ["MATCHES_RUNNING", "DRAW_DONE"];
      if (!allowedPhases.includes(currentPhase)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `경기 결과는 조 추첨 완료 후 입력 가능합니다. (현재: ${currentPhase})`
        );
      }

      // 🔥 3. 경기 정보 조회
      const matchRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}`
      );
      const matchSnap = await matchRef.get();

      if (!matchSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "경기를 찾을 수 없습니다."
        );
      }

      const match = matchSnap.data()!;
      const matchStage = match.stage || "GROUP";

      // 🔥 FINAL+ 단계: 결과 수정 모드 체크
      const resultEditEnabled = tournament.resultEditEnabled === true;
      const isFinished = match.status === "END" || match.status === "FINISHED" || match.status === "completed";
      
      // 토너먼트: 이미 완료된 경기는 수정 모드가 켜져있지 않으면 재입력 불가
      if (matchStage === "KNOCKOUT" && isFinished && !resultEditEnabled) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "이미 종료된 토너먼트 경기는 수정할 수 없습니다. 결과 수정 모드를 활성화해주세요."
        );
      }

      // 🔥 토너먼트는 divisionNumber가 없을 수 있음
      const divisionNumber = match.divisionNumber;
      const homeTeamId = match.homeTeamId;
      const awayTeamId = match.awayTeamId;

      if (matchStage === "GROUP" && (!divisionNumber || !homeTeamId || !awayTeamId)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "경기 정보가 불완전합니다. (divisionNumber, homeTeamId, awayTeamId 필요)"
        );
      }

      // 🔥 토너먼트는 homeTeamId와 awayTeamId만 필요 (BYE인 경우 awayTeamId가 null일 수 있음)
      if (matchStage === "KNOCKOUT" && !homeTeamId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "경기 정보가 불완전합니다. (homeTeamId 필요)"
        );
      }

      // 🔥 토너먼트 동점 처리: 동점 불가 (연장/승부차기 필요)
      if (matchStage === "KNOCKOUT" && homeScore === awayScore) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "토너먼트는 동점이 불가능합니다. 연장전 또는 승부차기 결과를 입력해주세요."
        );
      }

      // 🔥 4. 변경 전 데이터 저장 (감사 로그용)
      const beforeData = {
        homeScore: match.score?.home,
        awayScore: match.score?.away,
        status: match.status,
        winner: match.winner,
        winnerTeamId: match.winnerTeamId,
      };

      // 승자 결정
      let winner: "HOME" | "AWAY" | null = null;
      if (homeScore > awayScore) {
        winner = "HOME";
      } else if (awayScore > homeScore) {
        winner = "AWAY";
      }

      // 🔥 5. 경기 결과 업데이트 (트랜잭션)
      await db.runTransaction(async (tx) => {
        const currentMatchSnap = await tx.get(matchRef);
        if (!currentMatchSnap.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "경기를 찾을 수 없습니다."
          );
        }

        const currentMatch = currentMatchSnap.data()!;
        const matchStage = currentMatch.stage || "GROUP";
        
        // 경기 결과 업데이트
        const updateData: any = {
          status: "END", // MatchOpsStatus: "END" (기존 코드와 호환)
          score: {
            home: homeScore,
            away: awayScore,
          },
          winner: winner,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: uid,
        };

        // 🔥 토너먼트는 winnerTeamId 저장
        if (matchStage === "KNOCKOUT" && winner) {
          const winnerTeamId = winner === "HOME" ? homeTeamId : awayTeamId;
          updateData.winnerTeamId = winnerTeamId;
        }

        tx.update(matchRef, updateData);
      });

      // 🔥 6. 감사 로그 저장 (FINAL+ 단계)
      const afterData = {
        homeScore,
        awayScore,
        status: "END",
        winner,
        winnerTeamId: matchStage === "KNOCKOUT" && winner ? (winner === "HOME" ? homeTeamId : awayTeamId) : undefined,
      };

      // 변경 사항이 있을 때만 로그 저장
      const hasChanges = 
        beforeData.homeScore !== afterData.homeScore ||
        beforeData.awayScore !== afterData.awayScore ||
        beforeData.status !== afterData.status;

      if (hasChanges) {
        const auditLogsRef = tournamentRef.collection("auditLogs");
        await auditLogsRef.add({
          type: "MATCH_RESULT_UPDATE",
          matchId,
          matchStage,
          before: beforeData,
          after: afterData,
          updatedBy: uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            associationId,
            tournamentId,
            homeTeamId,
            awayTeamId,
            divisionNumber: matchStage === "GROUP" ? divisionNumber : undefined,
            round: match.round,
            matchNo: match.matchNo,
          },
        });

        logger.info(`[submitMatchResult] 감사 로그 저장`, {
          matchId,
          hasChanges,
        });
      }

      // 🔥 7. 순위표 자동 재계산 또는 승자 진출 처리
      const matchStage = match.stage || "GROUP";
      const winnerTeamId = winner === "HOME" ? match.homeTeamId : match.awayTeamId;
      
      if (matchStage === "GROUP" && match.divisionNumber) {
        // 조별 리그: 순위표 재계산
        await recomputeStandingsForDivision(
          associationId,
          tournamentId,
          match.divisionNumber
        );
      } else if (matchStage === "KNOCKOUT" && winnerTeamId) {
        // 토너먼트: 승자 자동 진출
        const { advanceWinnerToNextRound } = await import("./generateKnockoutBracket");
        const tournamentSnap = await tournamentRef.get();
        const tournamentData = tournamentSnap.data()!;
        const bracketSize = tournamentData.bracket?.size;

        const advanceResult = await advanceWinnerToNextRound(
          associationId,
          tournamentId,
          matchId,
          winnerTeamId,
          match.round || 1,
          match.matchNo || 1,
          bracketSize
        );

        // 🔥 결승 완료 시 tournament.phase = "DONE"
        if (advanceResult.isFinal) {
          await tournamentRef.update({
            tournamentPhase: "DONE",
            winnerTeamId: winnerTeamId,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            completedBy: uid,
          });

          logger.info(`[submitMatchResult] 결승 완료 - 대회 종료`, {
            tournamentId,
            winnerTeamId,
          });
        }
      }

      logger.info(`[submitMatchResult] 완료`, {
        matchId,
        homeScore,
        awayScore,
        winner,
      });

      return {
        success: true,
        matchId,
        homeScore,
        awayScore,
        winner,
        divisionNumber: matchStage === "GROUP" ? match.divisionNumber : undefined,
      };
    } catch (error: any) {
      logger.error(`[submitMatchResult] 오류`, {
        error: error?.message,
        stack: error?.stack,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `경기 결과 입력 중 오류가 발생했습니다: ${error?.message}`
      );
    }
  });

/**
 * 🔥 조별 리그 순위표 재계산 (A안: 그룹 전체 재계산)
 */
async function recomputeStandingsForDivision(
  associationId: string,
  tournamentId: string,
  divisionNumber: number
): Promise<void> {
  try {
    const matchesRef = db.collection(
      `associations/${associationId}/tournaments/${tournamentId}/matches`
    );

    // 해당 조의 완료된 경기만 조회
    const matchesQuery = matchesRef
      .where("divisionNumber", "==", divisionNumber)
      .where("status", "==", "END"); // MatchOpsStatus: "END"
    
    const matchesSnap = await matchesQuery.get();

    // 2. 팀별 스탯 초기화
    interface TeamStats {
      teamId: string;
      teamName: string;
      played: number;
      win: number;
      draw: number;
      loss: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDiff: number;
      points: number;
    }

    const teamStatsMap = new Map<string, TeamStats>();

    // 3. 경기 결과 집계
    matchesSnap.forEach((doc) => {
      const match = doc.data();
      const homeTeamId = match.homeTeamId;
      const awayTeamId = match.awayTeamId;
      const homeScore = match.score?.home || 0;
      const awayScore = match.score?.away || 0;

      if (!homeTeamId || !awayTeamId) return;

      // 홈팀 스탯
      if (!teamStatsMap.has(homeTeamId)) {
        teamStatsMap.set(homeTeamId, {
          teamId: homeTeamId,
          teamName: match.homeTeam || "팀명 없음",
          played: 0,
          win: 0,
          draw: 0,
          loss: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
        });
      }

      const homeStats = teamStatsMap.get(homeTeamId)!;
      homeStats.played += 1;
      homeStats.goalsFor += homeScore;
      homeStats.goalsAgainst += awayScore;

      if (homeScore > awayScore) {
        homeStats.win += 1;
        homeStats.points += 3;
      } else if (homeScore === awayScore) {
        homeStats.draw += 1;
        homeStats.points += 1;
      } else {
        homeStats.loss += 1;
      }

      // 원정팀 스탯
      if (!teamStatsMap.has(awayTeamId)) {
        teamStatsMap.set(awayTeamId, {
          teamId: awayTeamId,
          teamName: match.awayTeam || "팀명 없음",
          played: 0,
          win: 0,
          draw: 0,
          loss: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
        });
      }

      const awayStats = teamStatsMap.get(awayTeamId)!;
      awayStats.played += 1;
      awayStats.goalsFor += awayScore;
      awayStats.goalsAgainst += homeScore;

      if (awayScore > homeScore) {
        awayStats.win += 1;
        awayStats.points += 3;
      } else if (awayScore === homeScore) {
        awayStats.draw += 1;
        awayStats.points += 1;
      } else {
        awayStats.loss += 1;
      }
    });

    // 4. 득실차 계산
    teamStatsMap.forEach((stats) => {
      stats.goalDiff = stats.goalsFor - stats.goalsAgainst;
    });

    // 5. 순위 정렬 (승점 → 득실차 → 다득점 → 경기 수)
    const sortedTeams = Array.from(teamStatsMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.played - b.played;
    });

    // 6. 순위 할당
    sortedTeams.forEach((team, index) => {
      team.rank = index + 1;
    });

    // 7. Firestore에 저장 (standings 컬렉션)
    const standingsRef = db.collection(
      `associations/${associationId}/tournaments/${tournamentId}/standings`
    );

    const batch = db.batch();
    sortedTeams.forEach((team) => {
      const standingRef = standingsRef.doc(team.teamId);
      batch.set(
        standingRef,
        {
          teamId: team.teamId,
          teamName: team.teamName,
          divisionNumber,
          groupId: `조 ${divisionNumber}`, // 조별 리그는 divisionNumber를 groupId로 사용
          rank: team.rank,
          played: team.played,
          win: team.win,
          draw: team.draw,
          loss: team.loss,
          goalsFor: team.goalsFor,
          goalsAgainst: team.goalsAgainst,
          goalDiff: team.goalDiff,
          points: team.points,
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    logger.info(`[recomputeStandingsForDivision] 완료`, {
      divisionNumber,
      teamCount: sortedTeams.length,
    });
  } catch (error: any) {
    logger.error(`[recomputeStandingsForDivision] 오류`, {
      associationId,
      tournamentId,
      divisionNumber,
      error: error?.message,
    });
    throw error;
  }
}
