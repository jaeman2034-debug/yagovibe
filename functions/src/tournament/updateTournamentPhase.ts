/**
 * 🔥 대회 Phase 변경 Callable (B 작업: 안전한 상태 전이)
 * 
 * 기능:
 * - FSM(상태 머신) 강제: 허용된 phase 전이만 성공
 * - Idempotent: 같은 요청 N번 와도 결과는 1번과 동일
 * - Transaction 기반 원자적 처리: 레이스 컨디션 안전
 * - 승인 팀 조건 강제: 서버에서 최종 검증
 */

import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { MIN_PLAYERS, MAX_PLAYERS } from "./constants/rosterPolicy";

const db = admin.firestore();

// 🔥 Phase 타입 정의
type TournamentPhase = "ROSTER_OPEN" | "ROSTER_LOCKED" | "CHECKIN_OPEN" | "MATCHES_RUNNING" | null | undefined;

// 🔥 FSM: 허용된 Phase 전이 정의 (Set 기반으로 변경하여 성능 최적화)
const ALLOWED_TRANSITIONS: Record<string, Set<TournamentPhase>> = {
  // 초기 상태 (null/undefined)에서 시작 가능
  "": new Set(["ROSTER_OPEN"]),
  // ROSTER_OPEN에서 가능한 전이
  "ROSTER_OPEN": new Set(["ROSTER_LOCKED"]),
  // ROSTER_LOCKED에서 가능한 전이
  "ROSTER_LOCKED": new Set(["CHECKIN_OPEN"]),
  // CHECKIN_OPEN에서 가능한 전이
  "CHECKIN_OPEN": new Set(["MATCHES_RUNNING"]),
  // MATCHES_RUNNING은 종료 상태 (추가 전이 없음)
  "MATCHES_RUNNING": new Set([]),
};

/**
 * 🔥 FSM 검증: 현재 phase에서 요청한 phase로의 전이가 허용되는지 확인
 */
function isTransitionAllowed(currentPhase: TournamentPhase, requestedPhase: TournamentPhase): boolean {
  if (!requestedPhase) return false;
  
  // 현재 phase가 없으면 초기 상태로 간주
  const current = currentPhase || "";
  const allowed = ALLOWED_TRANSITIONS[current] || new Set();
  
  return allowed.has(requestedPhase);
}

/**
 * 🔥 팀원 수 검증 (MIN_PLAYERS ~ MAX_PLAYERS)
 */
async function validateTeamPlayerCounts(teams: admin.firestore.QueryDocumentSnapshot[]): Promise<void> {
  for (const teamDoc of teams) {
    const teamData = teamDoc.data();
    const playersRef = teamDoc.ref.collection("players");
    
    let playerCount = 0;
    try {
      const playersSnap = await playersRef.get();
      playerCount = playersSnap.size;
    } catch (e: any) {
      logger.error("❌ players 조회 실패", {
        teamId: teamDoc.id,
        teamName: teamData.teamName || teamData.name || "팀명 없음",
        error: e,
      });
      throw new HttpsError(
        "failed-precondition",
        `팀 "${teamData.teamName || teamData.name || teamDoc.id}"의 팀원 정보를 확인할 수 없습니다.`,
        { code: "TEAM_PLAYERS_QUERY_FAILED", teamId: teamDoc.id }
      );
    }
    
    if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
      const teamName = teamData.teamName || teamData.name || "팀명 없음";
      const errorCode = playerCount < MIN_PLAYERS ? "MIN_PLAYERS_NOT_MET" : "MAX_PLAYERS_EXCEEDED";
      const errorMessage = playerCount < MIN_PLAYERS
        ? `선수는 최소 ${MIN_PLAYERS}명 이상이어야 합니다`
        : `선수는 최대 ${MAX_PLAYERS}명까지 가능합니다`;
      const hint = playerCount < MIN_PLAYERS
        ? "팀 관리에서 선수 명단을 입력하세요"
        : "선수 명단을 확인하세요";
      
      throw new HttpsError(
        "failed-precondition",
        `팀 "${teamName}" ${errorMessage}: ${playerCount}명`,
        {
          code: errorCode,
          message: errorMessage,
          hint,
          teamId: teamDoc.id,
          teamName,
          playerCount,
          minRequired: MIN_PLAYERS,
          maxAllowed: MAX_PLAYERS,
        }
      );
    }
  }
}

/**
 * 🔥 대회 Phase 변경 구현 (B 작업: Transaction + FSM + Idempotent)
 */
export async function updateTournamentPhaseCallableImpl(request: any) {
  logger.info("===== updateTournamentPhase START (B 작업) =====");
  logger.info("[updateTournamentPhase] 요청 데이터:", {
    hasAuth: !!request.auth,
    uid: request.auth?.uid,
    data: request.data,
    associationId: request.data?.associationId,
    tournamentId: request.data?.tournamentId,
    phase: request.data?.phase,
    requestId: request.data?.requestId,
  });

  // 🔥 인증 체크
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { associationId, tournamentId, phase, requestId, reason } = request.data || {};
  const uid = request.auth.uid;
  
  // 🔥 requestId 정규화 (문자열로 변환, 없으면 undefined)
  const normalizedRequestId = requestId ? String(requestId).trim() : undefined;
  const normalizedReason = reason ? String(reason).trim() : undefined;

  // 🔥 입력 검증
  if (!associationId || !tournamentId || !phase) {
    logger.error("[updateTournamentPhase] 필수 파라미터 누락:", {
      associationId: !!associationId,
      tournamentId: !!tournamentId,
      phase: !!phase,
      rawData: request.data,
    });
    throw new HttpsError(
      "invalid-argument",
      "필수 파라미터가 누락되었습니다.",
      { code: "MISSING_REQUIRED_PARAMS" }
    );
  }

  // 🔥 허용된 phase 값 체크
  const allowedPhases: TournamentPhase[] = ["ROSTER_OPEN", "ROSTER_LOCKED", "CHECKIN_OPEN", "MATCHES_RUNNING"];
  if (!allowedPhases.includes(phase)) {
    throw new HttpsError(
      "invalid-argument",
      `허용되지 않은 phase입니다. (${allowedPhases.join(", ")}만 가능)`,
      { code: "INVALID_PHASE_VALUE", requestedPhase: phase, allowedPhases }
    );
  }

  try {
    // 🔥 associationId 정규화
    const normalizedAssociationId = String(associationId || "").trim();
    if (!normalizedAssociationId) {
      throw new HttpsError("invalid-argument", "associationId가 올바르지 않습니다.");
    }

    // 🔥 1. 관리자 권한 체크
    const associationRef = db.doc(`associations/${normalizedAssociationId}`);
    const associationSnap = await associationRef.get();

    if (!associationSnap.exists) {
      throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
    }

    const associationData = associationSnap.data();
    if (!associationData) {
      throw new HttpsError("not-found", "협회 데이터가 비어 있습니다.");
    }

    // 🔥 adminUids 타입 가드
    let isAdmin = false;
    if (Array.isArray(associationData.adminUids)) {
      isAdmin = associationData.adminUids.includes(uid);
    } else if (
      associationData.adminUids !== null &&
      associationData.adminUids !== undefined &&
      typeof associationData.adminUids === "object"
    ) {
      isAdmin = associationData.adminUids[uid] === true;
    } else {
      throw new HttpsError(
        "failed-precondition",
        "협회 관리자 정보가 손상되었습니다.",
        { code: "INVALID_ADMIN_UIDS_FORMAT" }
      );
    }

    if (!isAdmin) {
      throw new HttpsError(
        "permission-denied",
        "협회 관리자만 phase를 변경할 수 있습니다.",
        { code: "PERMISSION_DENIED", uid }
      );
    }

    // 🔥 2. Firestore Transaction으로 원자적 처리
    const tournamentRef = db.doc(
      `associations/${normalizedAssociationId}/tournaments/${tournamentId}`
    );

    const result = await db.runTransaction(async (tx) => {
      // 🔥 Tournament 문서 읽기 (트랜잭션 내)
      const tournamentSnap = await tx.get(tournamentRef);
      
      if (!tournamentSnap.exists) {
        throw new HttpsError("invalid-argument", "대회를 찾을 수 없습니다.", { 
          code: "INVALID_ARGUMENT",
          field: "tournamentId",
        });
      }

      const tournamentData = tournamentSnap.data()!;
      const currentPhase: TournamentPhase = tournamentData.tournamentPhase || null;
      const phaseVersion: number = Number(tournamentData.phaseVersion ?? 0);
      const lastPhaseUpdateRequestId: string | undefined = tournamentData.lastPhaseUpdateRequestId;
      const lastPhaseUpdateResult: any | undefined = tournamentData.lastPhaseUpdateResult;

      // 🔥 (멱등) requestId replay: 이미 같은 requestId 처리했으면 그대로 반환
      if (normalizedRequestId && lastPhaseUpdateRequestId === normalizedRequestId && lastPhaseUpdateResult) {
        logger.info("[updateTournamentPhase] ✅ Idempotent: requestId replay", {
          requestId: normalizedRequestId,
          result: lastPhaseUpdateResult,
        });
        return {
          ...lastPhaseUpdateResult,
          replay: true,
        };
      }

      // 🔥 (멱등) same state면 성공 처리 (alreadyInState)
      if (currentPhase === phase) {
        const idempotentResult = {
          success: true,
          alreadyInState: true,
          phase: currentPhase,
          phaseVersion,
          message: `이미 ${phase} 상태입니다.`,
        };
        
        logger.info("[updateTournamentPhase] ✅ Idempotent: 이미 요청한 phase 상태", {
          currentPhase,
          requestedPhase: phase,
          requestId: normalizedRequestId,
        });
        
        // 🔥 requestId가 있으면 결과 저장해 두면 다음 replay도 완벽 멱등
        if (normalizedRequestId) {
          tx.update(tournamentRef, {
            lastPhaseUpdateRequestId: normalizedRequestId,
            lastPhaseUpdateResult: idempotentResult,
            lastPhaseUpdateAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        
        return idempotentResult;
      }

      // 🔥 FSM 검증: 허용된 전이인지 확인
      const allowed = ALLOWED_TRANSITIONS[currentPhase || ""];
      if (!allowed || !allowed.has(phase)) {
        logger.error("[updateTournamentPhase] ❌ FSM: 허용되지 않은 전이", {
          currentPhase,
          requestedPhase: phase,
          allowedTransitions: allowed ? Array.from(allowed) : [],
        });
        throw new HttpsError(
          "failed-precondition",
          `"${currentPhase || "초기"}" 상태에서 "${phase}" 상태로 전이할 수 없습니다.`,
          {
            code: "INVALID_TRANSITION",
            currentPhase,
            requestedPhase: phase,
            allowedTransitions: allowed ? Array.from(allowed) : [],
          }
        );
      }

      // 🔥 3. ROSTER_OPEN -> ROSTER_LOCKED 전이 시 승인 팀 조건 강제 검증 (Stats 최적화)
      if (currentPhase === "ROSTER_OPEN" && phase === "ROSTER_LOCKED") {
        // 🔥 Stats 문서 초기화 (없으면 생성)
        const statsRef = tournamentRef.collection("stats").doc("teams");
        const statsSnap = await tx.get(statsRef);
        
        let approvedCount = 0;
        if (statsSnap.exists) {
          const statsData = statsSnap.data()!;
          approvedCount = Number(statsData.approvedCount ?? 0);
        } else {
          // Stats 문서가 없으면 초기화 (트랜잭션 내에서)
          tx.set(statsRef, {
            approvedCount: 0,
            pendingCount: 0,
            rejectedCount: 0,
            totalCount: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          approvedCount = 0;
        }
        
        if (approvedCount < 1) {
          throw new HttpsError(
            "failed-precondition",
            "승인된 팀이 1개 이상 필요합니다.",
            {
              code: "NO_APPROVED_TEAMS",
              approvedCount,
              minRequired: 1,
              nextActionHint: "참가 신청 관리 탭에서 팀을 승인해주세요.",
            }
          );
        }

        logger.info("[updateTournamentPhase] ✅ 승인 팀 수 검증 통과 (Stats)", {
          approvedTeamsCount: approvedCount,
        });
      }

      // 🔥 4. Tournament Phase 업데이트 (트랜잭션 내)
      const newVersion = phaseVersion + 1;
      const updateData: any = {
        tournamentPhase: phase,
        phaseVersion: newVersion,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPhaseUpdateRequestId: normalizedRequestId ?? null,
        lastPhaseUpdateAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // 🔥 Phase별 타임스탬프 필드
      if (phase === "ROSTER_OPEN") {
        updateData.rosterOpenedAt = admin.firestore.FieldValue.serverTimestamp();
      } else if (phase === "ROSTER_LOCKED") {
        updateData.rosterLockedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      // 🔥 응답 결과 저장 (idempotent replay용)
      const updateResult = {
        success: true,
        alreadyInState: false,
        phase,
        phaseVersion: newVersion,
        message:
          phase === "ROSTER_OPEN"
            ? "팀원 등록 기간이 시작되었습니다."
            : phase === "ROSTER_LOCKED"
            ? "팀원 등록이 잠겼습니다."
            : "Phase가 변경되었습니다.",
      };
      updateData.lastPhaseUpdateResult = updateResult;

      tx.update(tournamentRef, updateData);

      // 🔥 5. Phase 이벤트 로그 (트랜잭션 내에서 기록)
      const eventRef = tournamentRef.collection("phaseEvents").doc();
      tx.set(eventRef, {
        fromPhase: currentPhase || null,
        toPhase: phase,
        actorUid: uid,
        requestId: normalizedRequestId ?? null,
        reason: normalizedReason ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: Date.now(),
      });

      logger.info("[updateTournamentPhase] ✅ Transaction 내 Phase 업데이트 예약", {
        fromPhase: currentPhase,
        toPhase: phase,
        phaseVersion: newVersion,
        requestId: normalizedRequestId,
      });

      return {
        ...updateResult,
        fromPhase: currentPhase,
      };
    });

    // 🔥 6. ROSTER_OPEN -> ROSTER_LOCKED 전이 시 팀원 수 검증 및 팀 잠금 처리
    if (result.fromPhase === "ROSTER_OPEN" && phase === "ROSTER_LOCKED" && !result.alreadyInState && !result.replay) {
      try {
        // 🔥 승인된 팀 조회
        const teamsRef = db.collection(
          `associations/${normalizedAssociationId}/tournaments/${tournamentId}/teams`
        );
        const approvedQuery = teamsRef.where("status", "==", "APPROVED");
        const approvedTeamsSnap = await approvedQuery.get();

        // 🔥 모든 승인된 팀의 팀원 수 검증
        await validateTeamPlayerCounts(approvedTeamsSnap.docs);

        // 🔥 모든 팀 잠금 처리
        const allTeamsSnap = await teamsRef.get();
        const batch = db.batch();
        let lockedCount = 0;

        allTeamsSnap.docs.forEach((teamDoc) => {
          const teamData = teamDoc.data();
          if (teamData && teamData.rosterLocked !== true) {
            batch.update(teamDoc.ref, {
              rosterLocked: true,
              rosterLockedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            lockedCount++;
          }
        });

        if (lockedCount > 0) {
          await batch.commit();
          logger.info("[updateTournamentPhase] ✅ 팀 잠금 완료", { lockedCount });
        }
      } catch (batchError: any) {
        // 팀 잠금/검증 실패는 경고만 (phase는 이미 변경됨, 재시도 가능)
        logger.error("❌ 팀 잠금/검증 처리 실패 (phase는 변경됨)", {
          error: batchError,
        });
        // 에러가 HttpsError면 다시 throw (예: 팀원 수 오류)
        if (batchError instanceof HttpsError) {
          throw batchError;
        }
      }
    }

    // 🔥 이벤트 로그는 트랜잭션 내에서 이미 기록됨 (위 5번 단계)

    logger.info("[updateTournamentPhase] ✅ Phase 변경 완료", {
      associationId: normalizedAssociationId,
      tournamentId,
      fromPhase: result.fromPhase,
      toPhase: result.phase || phase,
      phaseVersion: result.phaseVersion,
      alreadyInState: result.alreadyInState,
      replay: result.replay || false,
      uid,
      requestId: normalizedRequestId,
    });

    return result;
  } catch (err: any) {
    logger.error("[updateTournamentPhase] FATAL ERROR", err);

    // ✅ HttpsError는 그대로 전달 (에러 메시지 보존)
    if (err instanceof HttpsError) {
      throw err;
    }

    // 기타 오류는 HttpsError로 변환
    throw new HttpsError(
      "internal",
      err?.message || "updateTournamentPhaseCallable 내부 오류",
      {
        code: "INTERNAL_ERROR",
        originalError: String(err),
      }
    );
  }
}
