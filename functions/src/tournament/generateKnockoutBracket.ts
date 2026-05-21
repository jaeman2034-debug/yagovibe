/**
 * 🔥 STEP 7 확장: 토너먼트 브라켓 생성 Callable (완성본)
 * 
 * Single Elimination 토너먼트 브라켓 자동 생성
 * - 승인 팀 수에 맞춰 브라켓 사이즈 결정 (2의 거듭제곱)
 * - BYE 처리 (부전승)
 * - 1라운드 매칭 자동 생성
 * - BYE 승자 자동 진출
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = admin.firestore();

interface GenerateKnockoutBracketRequest {
  associationId: string;
  tournamentId: string;
}

/**
 * 🔥 다음 2의 거듭제곱 계산 (브라켓 사이즈 결정)
 */
function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 2;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * 🔥 승자를 다음 라운드로 자동 진출 (내부 함수)
 * 
 * 정답 계산식:
 * - nextRound = round + 1
 * - nextMatchNo = Math.ceil(matchNo / 2)
 * - slot: matchNo가 홀수면 homeTeamId, 짝수면 awayTeamId
 */
async function advanceWinnerInternal({
  tournamentRef,
  round,
  matchNo,
  winnerTeamId,
  uid,
  bracketSize,
}: {
  tournamentRef: admin.firestore.DocumentReference;
  round: number;
  matchNo: number;
  winnerTeamId: string;
  uid: string;
  bracketSize: number;
}): Promise<{ isFinal: boolean; nextMatchId: string }> {
  const nextRound = round + 1;
  const nextMatchNo = Math.ceil(matchNo / 2);
  const slot = matchNo % 2 === 1 ? "homeTeamId" : "awayTeamId";

  // 🔥 결승 판별: 총 라운드 수 = log2(bracketSize)
  const totalRounds = Math.log2(bracketSize);
  const isFinal = round >= totalRounds;

  logger.info(`[advanceWinnerInternal] 승자 진출 처리`, {
    round,
    matchNo,
    nextRound,
    nextMatchNo,
    slot,
    isFinal,
    winnerTeamId,
  });

  // 🔥 결승이면 다음 라운드 경기 생성 안 함
  if (isFinal) {
    logger.info(`[advanceWinnerInternal] 결승 완료 - 다음 라운드 없음`);
    return { isFinal: true, nextMatchId: "" };
  }

  const matchesRef = tournamentRef.collection("matches");
  const nextMatchId = `R${nextRound}_M${nextMatchNo}`;
  const nextMatchRef = matchesRef.doc(nextMatchId);

  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();

  // 승자 팀 정보 조회
  const teamRef = tournamentRef.collection("teams").doc(winnerTeamId);
  const teamSnap = await teamRef.get();
  const teamName = teamSnap.exists
    ? teamSnap.data()?.teamName || teamSnap.data()?.name || "팀명 없음"
    : "팀명 없음";

  // 다음 라운드 경기 조회 또는 생성 (merge: true로 upsert)
  const nextMatchSnap = await nextMatchRef.get();

  if (!nextMatchSnap.exists) {
    // 다음 라운드 경기 생성
    await nextMatchRef.set({
      stage: "KNOCKOUT",
      round: nextRound,
      matchNo: nextMatchNo,
      [slot]: winnerTeamId,
      [slot === "homeTeamId" ? "homeTeam" : "awayTeam"]: teamName,
      [slot === "homeTeamId" ? "awayTeamId" : "homeTeamId"]: null,
      [slot === "homeTeamId" ? "awayTeam" : "homeTeam"]: null,
      status: "WAIT", // 상대방이 채워질 때까지 대기
      createdAt: now,
      updatedAt: now,
      createdBy: uid,
    });

    logger.info(`[advanceWinnerInternal] 다음 라운드 경기 생성`, {
      nextRound,
      nextMatchNo,
      slot,
      winnerTeamId,
      nextMatchId,
    });
  } else {
    // 다음 라운드 경기 업데이트 (슬롯 채우기)
    const nextMatchData = nextMatchSnap.data()!;

    await nextMatchRef.update({
      [slot]: winnerTeamId,
      [slot === "homeTeamId" ? "homeTeam" : "awayTeam"]: teamName,
      updatedAt: now,
      updatedBy: uid,
    });

    // 양쪽 팀이 모두 채워졌으면 WAIT 상태 유지
    const homeTeamId = slot === "homeTeamId" ? winnerTeamId : nextMatchData.homeTeamId;
    const awayTeamId = slot === "awayTeamId" ? winnerTeamId : nextMatchData.awayTeamId;

    if (homeTeamId && awayTeamId) {
      await nextMatchRef.update({
        status: "WAIT", // 양쪽 팀이 모두 채워짐
      });
    }

    logger.info(`[advanceWinnerInternal] 다음 라운드 경기 업데이트`, {
      nextRound,
      nextMatchNo,
      slot,
      winnerTeamId,
      bothFilled: !!(homeTeamId && awayTeamId),
      nextMatchId,
    });
  }

  return { isFinal: false, nextMatchId };
}

/**
 * 🔥 토너먼트 브라켓 생성 (관리자 전용)
 */
export const generateKnockoutBracketCallable = functions
  .region("asia-northeast3")
  .https.onCall(async (data: GenerateKnockoutBracketRequest, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId } = data;
    const uid = context.auth.uid;

    // 🔥 입력 검증
    if (!associationId || !tournamentId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    logger.info(`[generateKnockoutBracket] 시작`, {
      associationId,
      tournamentId,
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
          "협회 관리자만 브라켓을 생성할 수 있습니다."
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

      // 🔥 브라켓 생성 가능 Phase: ROSTER_LOCKED 또는 DRAW_DONE 이후
      const allowedPhases = ["ROSTER_LOCKED", "DRAW_DONE"];
      if (!allowedPhases.includes(currentPhase)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `브라켓은 명단 확정 후 생성 가능합니다. (현재: ${currentPhase})`
        );
      }

      // 🔥 3. Idempotent 체크: 이미 토너먼트 경기가 있으면 생성 막기
      const matchesRef = tournamentRef.collection("matches");
      const existingMatchesSnap = await matchesRef
        .where("stage", "==", "KNOCKOUT")
        .limit(1)
        .get();

      if (!existingMatchesSnap.empty) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "이미 토너먼트 브라켓이 생성되었습니다. 중복 생성할 수 없습니다."
        );
      }

      // 🔥 4. 승인된 팀 목록 조회
      const teamsRef = tournamentRef.collection("teams");
      const teamsQuery = teamsRef.where("status", "==", "APPROVED");
      const teamsSnap = await teamsQuery.get();

      if (teamsSnap.empty) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "승인된 팀이 없습니다."
        );
      }

      if (teamsSnap.size < 2) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "토너먼트는 최소 2팀이 필요합니다."
        );
      }

      const teams = teamsSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().teamName || doc.data().name || "팀명 없음",
        seed: doc.data().seed || null, // draw 결과의 seed 사용
      }));

      const teamCount = teams.length;

      // 🔥 5. 브라켓 사이즈 계산 (2의 거듭제곱으로 올림)
      const bracketSize = nextPowerOfTwo(teamCount);
      const byes = bracketSize - teamCount;

      logger.info(`[generateKnockoutBracket] 브라켓 사이즈 계산`, {
        teamCount,
        bracketSize,
        byes,
      });

      // 🔥 6. Seed 배열 생성 (draw 결과의 seed 순서 사용, 없으면 팀 순서)
      const seededTeams = teams
        .map((team, index) => ({
          ...team,
          seed: team.seed || index + 1,
        }))
        .sort((a, b) => (a.seed || 0) - (b.seed || 0));

      // 🔥 7. BYE 채우기 (null로 패딩)
      const seeds: Array<{ id: string; name: string; seed: number } | null> = [
        ...seededTeams,
      ];
      while (seeds.length < bracketSize) {
        seeds.push(null);
      }

      // 🔥 8. 1라운드 매칭 생성 (표준 토너먼트 규칙)
      // seed1 vs seed(bracketSize)
      // seed2 vs seed(bracketSize-1)
      // ...
      const totalMatches = bracketSize / 2;
      const FieldValue = admin.firestore.FieldValue;
      const now = FieldValue.serverTimestamp();

      // 🔥 9. 트랜잭션으로 브라켓 생성
      await db.runTransaction(async (tx) => {
        const matchesCol = tournamentRef.collection("matches");

        for (let i = 0; i < totalMatches; i++) {
          const home = seeds[i];
          const away = seeds[bracketSize - 1 - i];
          const matchNo = i + 1;
          const matchId = `R1_M${matchNo}`;
          const matchRef = matchesCol.doc(matchId);

          // BYE 처리: home만 있고 away가 null
          if (home && !away) {
            tx.set(matchRef, {
              stage: "KNOCKOUT",
              round: 1,
              matchNo,
              homeTeamId: home.id,
              homeTeam: home.name,
              awayTeamId: null,
              awayTeam: null,
              status: "END", // BYE는 즉시 완료
              winner: "HOME",
              winnerTeamId: home.id, // BYE 승자
              score: {
                home: 0,
                away: 0,
              },
              isBye: true, // BYE 표시
              createdAt: now,
              updatedAt: now,
              createdBy: uid,
            });
          } else if (home && away) {
            // 정상 매칭
            tx.set(matchRef, {
              stage: "KNOCKOUT",
              round: 1,
              matchNo,
              homeTeamId: home.id,
              homeTeam: home.name,
              awayTeamId: away.id,
              awayTeam: away.name,
              status: "WAIT", // 예정
              createdAt: now,
              updatedAt: now,
              createdBy: uid,
            });
          }
        }

        // 🔥 10. Tournament 문서에 bracket 정보 저장
        tx.update(tournamentRef, {
          bracket: {
            format: "SINGLE_ELIMINATION",
            size: bracketSize,
            teamCount,
            byes,
            seedSource: "DRAW_DONE",
            createdAt: now,
            createdBy: uid,
          },
          tournamentPhase: "MATCHES_RUNNING", // 브라켓 생성 후 경기 진행 단계로
        });
      });

      // 🔥 11. BYE 승자 자동 진출 처리 (트랜잭션 외부에서 실행)
      // BYE 경기는 이미 END 상태이므로, advanceWinnerInternal을 호출하여 다음 라운드에 배치
      for (let i = 0; i < totalMatches; i++) {
        const home = seeds[i];
        const away = seeds[bracketSize - 1 - i];
        const matchNo = i + 1;

        if (home && !away) {
          try {
            // BYE 승자 자동 진출
            await advanceWinnerInternal({
              tournamentRef,
              round: 1,
              matchNo,
              winnerTeamId: home.id,
              uid,
              bracketSize,
            });
          } catch (error: any) {
            logger.warn(`[generateKnockoutBracket] BYE 승자 진출 처리 실패`, {
              teamId: home.id,
              matchNo,
              error: error?.message,
            });
            // BYE 진출 실패해도 브라켓 생성은 성공으로 처리
          }
        }
      }

      logger.info(`[generateKnockoutBracket] 완료`, {
        bracketSize,
        teamCount,
        byes,
        round1Matches: totalMatches,
      });

      return {
        success: true,
        bracketSize,
        teamCount,
        byes,
        round1Matches: totalMatches,
      };
    } catch (error: any) {
      logger.error(`[generateKnockoutBracket] 오류`, {
        error: error?.message,
        stack: error?.stack,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `브라켓 생성 중 오류가 발생했습니다: ${error?.message}`
      );
    }
  });

/**
 * 🔥 승자를 다음 라운드로 자동 진출 (외부 호출용 - submitMatchResult에서 사용)
 */
export async function advanceWinnerToNextRound(
  associationId: string,
  tournamentId: string,
  matchId: string,
  winnerTeamId: string,
  currentRound: number,
  currentMatchNo: number,
  bracketSize?: number
): Promise<{ isFinal: boolean; nextMatchId?: string }> {
  try {
    const tournamentRef = db.doc(
      `associations/${associationId}/tournaments/${tournamentId}`
    );

    // bracketSize가 없으면 tournament에서 조회
    if (!bracketSize) {
      const tournamentSnap = await tournamentRef.get();
      const tournamentData = tournamentSnap.data()!;
      bracketSize = tournamentData.bracket?.size || 16; // 기본값 16
    }

    const result = await advanceWinnerInternal({
      tournamentRef,
      round: currentRound,
      matchNo: currentMatchNo,
      winnerTeamId,
      uid: "system", // 시스템 호출
      bracketSize,
    });

    return result;
  } catch (error: any) {
    logger.error(`[advanceWinnerToNextRound] 오류`, {
      associationId,
      tournamentId,
      matchId,
      error: error?.message,
    });
    throw error;
  }
}
