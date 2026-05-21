/**
 * 🔥 참가 신청 승인 Cloud Function
 * 
 * 승인 시:
 * 1. application.status = "APPROVED"
 * 2. teams/{teamId} 생성 (대진표용)
 * 3. payment 문서 생성 (결제 관리용)
 * 4. tournament.participantsCountApproved 업데이트
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { sendEmail } from "../notifications/emailSender";
import { logger } from "firebase-functions";
import { updateApprovedCountOnStatusChange } from "./utils/tournamentStats";

const db = admin.firestore();
const auth = admin.auth();

/**
 * 참가 신청 승인 (Callable Function)
 * 
 * @param request.data
 *   - associationId: string
 *   - tournamentId: string
 *   - applicationId: string
 */
export const approveApplicationCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    // ⭐⭐⭐ 디버깅: 함수 호출 시점 로깅 (중복 호출 감지)
    const callTimestamp = Date.now();
    logger.info("[approveApplication] 🔵 함수 호출됨", {
      applicationId: request.data?.applicationId,
      associationId: request.data?.associationId,
      tournamentId: request.data?.tournamentId,
      uid: request.auth?.uid,
      timestamp: callTimestamp,
      time: new Date().toISOString(),
      requestId: (request as any).requestId || "unknown",
    });
    console.log("[approveApplication] 🔵 함수 호출됨", {
      applicationId: request.data?.applicationId,
      timestamp: callTimestamp,
      time: new Date().toISOString(),
    });

    // ⭐⭐⭐ 1단계: 인증 확인 (GET 요청 차단 포함)
    if (!request.auth) {
      logger.warn("[approveApplication] ❌ 인증 없음 (GET 요청 가능성)", {
        method: (request as any).method,
        headers: (request as any).headers,
      });
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // ⭐⭐⭐ 2단계: GET 요청 차단 (Callable은 POST만 허용)
    const requestMethod = (request as any).method || (request as any).rawRequest?.method;
    if (requestMethod === "GET") {
      logger.error("[approveApplication] ❌ GET 요청 차단", {
        method: requestMethod,
        applicationId: request.data?.applicationId,
      });
      throw new HttpsError(
        "invalid-argument",
        "잘못된 요청 방식입니다. POST 요청만 허용됩니다."
      );
    }

    const { associationId, tournamentId, applicationId } = request.data || {};

    if (!associationId || !tournamentId || !applicationId) {
      throw new HttpsError(
        "invalid-argument",
        "associationId, tournamentId, applicationId가 필요합니다."
      );
    }

    // ⭐⭐⭐ 핵심 가드 0: tournament 상태 최우선 체크 (함수 실행 자체를 차단)
    // 인증 체크 전, 모든 로직 전, 가장 먼저 실행 (충돌 근본 원인 제거)
    const tournamentRef = db.doc(
      `associations/${associationId}/tournaments/${tournamentId}`
    );
    const tournamentSnap = await tournamentRef.get();

    if (!tournamentSnap.exists) {
      throw new HttpsError("not-found", "대회를 찾을 수 없습니다.");
    }

    const tournamentData = tournamentSnap.data()!;
    const tournamentStatus = tournamentData?.status?.toUpperCase();

    // ⭐⭐⭐ 디버깅: tournament 상태 로깅
    logger.info("[approveApplication] 📊 tournament 상태 확인", {
      tournamentId,
      applicationId,
      tournamentStatus: tournamentData?.status,
      bracketLocked: tournamentData?.bracket?.locked,
      timestamp: Date.now(),
    });

    // ⭐⭐⭐ 대진표 생성 이후 승인 완전 차단 (충돌 근본 원인 제거)
    if (tournamentStatus === "MATCHES_GENERATED" || 
        tournamentData?.bracket?.locked === true) {
      logger.warn("[approveApplication] ❌ 대진표 생성 후 승인 시도 차단 (최상단 가드)", {
        tournamentId,
        applicationId,
        tournamentStatus: tournamentData?.status,
        bracketLocked: tournamentData?.bracket?.locked,
        timestamp: Date.now(),
      });
      throw new HttpsError(
        "failed-precondition",
        "대진표가 이미 생성된 대회는 참가 승인을 할 수 없습니다."
      );
    }

    const uid = request.auth.uid;

    // 🔥 catch 블록에서 사용하기 위해 변수 선언 (스코프 문제 해결)
    let appDataForError: any = null;
    let appRef: admin.firestore.DocumentReference | null = null;

    try {

      // 1. 관리자 권한 확인 (Admin SDK로 직접 확인)
      const associationRef = db.doc(`associations/${associationId}`);
      const associationDoc = await associationRef.get();

      if (!associationDoc.exists) {
        throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
      }

      const associationData = associationDoc.data()!;
      const adminUids = associationData.adminUids || [];

      if (!adminUids.includes(uid)) {
        throw new HttpsError(
          "permission-denied",
          "관리자 권한이 필요합니다."
        );
      }

      // 2. 신청 문서 조회
      appRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
      );
      const appDoc = await appRef.get();

      if (!appDoc.exists) {
        throw new HttpsError("not-found", "참가 신청을 찾을 수 없습니다.");
      }

      const appData = appDoc.data()!;
      
      // 🔥 catch 블록에서 사용하기 위해 변수 업데이트
      appDataForError = {
        teamName: appData?.teamName,
        teamCount: appData?.teamCount,
        status: appData?.status,
      };
      
      // ⭐⭐⭐ 핵심 1: 상태 가드 (트랜잭션 전에 체크 - aborted 방지)
      const normalizedStatus = appData.status?.toUpperCase();
      
      // ⭐⭐⭐ 이미 처리된 상태는 즉시 반환 (트랜잭션 진입 전 차단)
      if (normalizedStatus === "APPROVED") {
        logger.info("[approveApplication] ✅ 이미 승인된 신청 (트랜잭션 전 차단)", {
          applicationId,
          currentStatus: appData.status,
          timestamp: Date.now(),
        });
        return { 
          success: true, 
          message: "이미 승인된 신청입니다.",
          alreadyApproved: true,
        };
      }

      if (normalizedStatus === "REJECTED") {
        logger.warn("[approveApplication] ❌ 거절된 신청 승인 시도", {
          applicationId,
          currentStatus: appData.status,
        });
        throw new HttpsError(
          "failed-precondition",
          "거절된 신청은 승인할 수 없습니다."
        );
      }
      
      // ⭐⭐⭐ PENDING 또는 HOLD 상태만 승인 가능 (트랜잭션 전 체크)
      if (normalizedStatus !== "PENDING" && normalizedStatus !== "HOLD") {
        logger.error("[approveApplication] ❌ 승인할 수 없는 상태 (트랜잭션 전 차단)", { 
          applicationId, 
          status: appData.status,
          normalizedStatus,
          timestamp: Date.now(),
        });
        throw new HttpsError(
          "failed-precondition",
          `이미 처리된 신청입니다. (현재 상태: ${appData.status})`
        );
      }
      
      // 🔥 필수 필드 검증
      if (!appData.teamName || typeof appData.teamName !== "string" || appData.teamName.trim() === "") {
        logger.error("[approveApplication] ❌ teamName이 없거나 유효하지 않음", { 
          applicationId, 
          teamName: appData.teamName,
          teamNameType: typeof appData.teamName,
          appDataKeys: Object.keys(appData),
        });
        throw new HttpsError(
          "failed-precondition",
          "팀명 정보가 없습니다. 신청 정보를 확인해주세요."
        );
      }

      if (!appData.teamCount || typeof appData.teamCount !== "number" || appData.teamCount < 1) {
        logger.error("[approveApplication] ❌ teamCount가 없거나 유효하지 않음", { 
          applicationId, 
          teamCount: appData.teamCount,
          teamCountType: typeof appData.teamCount,
        });
        throw new HttpsError(
          "failed-precondition",
          "팀 수 정보가 없거나 유효하지 않습니다."
        );
      }

      // 🔥 디버깅: appData 전체 구조 로깅 (문제 진단용)
      logger.info("[approveApplication] appData 구조", {
        applicationId,
        hasTeamName: !!appData.teamName,
        hasTeamCount: !!appData.teamCount,
        hasFeePolicySnapshot: !!appData.feePolicySnapshot,
        status: appData.status,
        keys: Object.keys(appData),
      });

      // 🔥 가드: uid가 없으면 즉시 종료 (방어 코드)
      if (!uid || typeof uid !== "string") {
        logger.error("[approveApplication] uid가 유효하지 않음", { uid, applicationId });
        throw new HttpsError(
          "internal",
          "인증 정보가 유효하지 않습니다."
        );
      }

      // 2-1. tournament 문서는 이미 위에서 읽었으므로 재사용
      // (최상단 가드에서 이미 tournamentSnap과 tournamentData를 읽음)
      const currentParticipantsCount = (tournamentData?.participantsCountApproved ?? 0) as number;

      // 🔥 디버깅: 트랜잭션 시작 전 로그
      logger.info("[approveApplication] 트랜잭션 시작", {
        applicationId,
        teamName: appData.teamName,
        teamCount: appData.teamCount,
        status: appData.status,
        normalizedStatus,
        uid,
      });

      // ⭐⭐⭐ 핵심: 트랜잭션 재시도 로직 (동시성 충돌 해결)
      const MAX_RETRIES = 3;
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // ⭐⭐⭐ 재시도 전 상태 재확인 (다른 트랜잭션이 이미 승인했을 수 있음)
          if (attempt > 1) {
            logger.info("[approveApplication] 재시도 전 상태 재확인", {
              applicationId,
              attempt,
              timestamp: Date.now(),
            });
            
            // ⭐⭐⭐ 핵심: 재시도 전에 tournament 상태도 다시 확인 (대진표 생성 중일 수 있음)
            const recheckTournamentSnap = await tournamentRef.get();
            if (recheckTournamentSnap.exists) {
              const recheckTournamentData = recheckTournamentSnap.data()!;
              const recheckTournamentStatus = recheckTournamentData?.status?.toUpperCase();
              
              // 대진표 생성이 시작되었으면 즉시 차단
              if (recheckTournamentStatus === "MATCHES_GENERATED" || 
                  recheckTournamentData?.bracket?.locked === true) {
                logger.warn("[approveApplication] ❌ 재시도 전: 대진표 생성 감지 (차단)", {
                  applicationId,
                  attempt,
                  tournamentStatus: recheckTournamentData?.status,
                });
                throw new HttpsError(
                  "failed-precondition",
                  "대진표 생성이 진행 중이거나 완료되었습니다. 승인을 할 수 없습니다."
                );
              }
            }
            
            const recheckDoc = await appRef.get();
            if (recheckDoc.exists) {
              const recheckStatus = recheckDoc.data()?.status?.toUpperCase();
              if (recheckStatus === "APPROVED") {
                logger.info("[approveApplication] ✅ 재시도 전: 이미 승인됨 (idempotent 성공)", {
                  applicationId,
                  attempt,
                });
                return {
                  success: true,
                  message: "이미 승인된 신청입니다.",
                  alreadyApproved: true,
                };
              }
            }
            
            // 재시도 전 잠시 대기 (동시성 충돌 감소)
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          }

          // ⭐⭐⭐ 핵심: 트랜잭션 범위 최소화 - application.status만 변경 (충돌 방지)
          // teams, payment, tournament 업데이트는 트랜잭션 밖에서 처리
          await db.runTransaction(async (tx) => {
            // ⭐⭐⭐ Firestore 규칙: 모든 읽기를 먼저 수행해야 함
            // 1단계: 모든 읽기 작업 수행
            const [tournamentSnapInTx, appSnapInTx] = await Promise.all([
              tx.get(tournamentRef),
              tx.get(appRef),
            ]);
            
            // 2단계: 읽기 결과 검증 및 처리
            // ⭐⭐⭐ 트랜잭션 내부: tournament 상태 확인 (대진표 생성 중일 수 있음)
            if (tournamentSnapInTx.exists) {
              const tournamentDataInTx = tournamentSnapInTx.data()!;
              const tournamentStatusInTx = tournamentDataInTx?.status?.toUpperCase();
              
              // 대진표 생성이 시작되었으면 즉시 차단 (트랜잭션 내부에서도 확인)
              if (tournamentStatusInTx === "MATCHES_GENERATED" || 
                  tournamentDataInTx?.bracket?.locked === true) {
                logger.warn("[approveApplication] ❌ 트랜잭션 내부: 대진표 생성 감지 (차단)", {
                  applicationId,
                  tournamentStatus: tournamentDataInTx?.status,
                });
                throw new Error("대진표 생성이 진행 중이거나 완료되었습니다. 승인을 할 수 없습니다.");
              }
            }
            
            // ⭐⭐⭐ 트랜잭션 내부에서 다시 상태 확인 (동시성 충돌 방지)
            if (!appSnapInTx.exists) {
              throw new Error("참가 신청을 찾을 수 없습니다.");
            }
            
            const appDataInTx = appSnapInTx.data()!;
            const currentStatusInTx = appDataInTx.status?.toUpperCase();
            
            // ⭐⭐⭐ Idempotent: 트랜잭션 내부에서도 이미 승인된 경우 처리
            if (currentStatusInTx === "APPROVED") {
              logger.info("[approveApplication] ✅ 트랜잭션 내부: 이미 승인됨 (idempotent)", {
                applicationId,
                currentStatus: appDataInTx.status,
              });
              // 이미 승인된 경우 성공 반환 (아무것도 업데이트하지 않음)
              return;
            }
            
            // 🔥 PENDING/HOLD 상태 확인 (트랜잭션 내부에서도)
            if (currentStatusInTx !== "PENDING" && currentStatusInTx !== "HOLD") {
              throw new Error(`승인할 수 없는 상태입니다. (현재 상태: ${appDataInTx.status})`);
            }

            // 🔥 undefined 체크
            if (!uid || typeof uid !== "string") {
              throw new Error("승인자 정보가 유효하지 않습니다.");
            }
            
            // 3단계: 모든 읽기 완료 후 쓰기 작업 수행
            // ⭐⭐⭐ 승인 = 상태 변경 + stats 업데이트 (트랜잭션 범위 최소화)
            const appUpdateData: any = {
              status: "APPROVED",
              rosterStatus: "draft",
              approvedAt: admin.firestore.FieldValue.serverTimestamp(),
              approvedBy: uid,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            // 🔥 Stats 업데이트: PENDING → APPROVED
            await updateApprovedCountOnStatusChange(
              tx,
              associationId,
              tournamentId,
              currentStatusInTx, // "PENDING" 또는 "HOLD"
              "APPROVED"
            );
            
            logger.info("[approveApplication] ✅ 트랜잭션: application.status + stats 업데이트", {
              applicationId,
              approvedBy: uid,
            });

            tx.update(appRef, appUpdateData);
            // ⭐⭐⭐ 여기서 트랜잭션 종료 - teams, payment, tournament는 밖에서 처리
          });

          // ⭐⭐⭐ 트랜잭션 성공 시 루프 종료
          break;
        } catch (txError: any) {
          lastError = txError;
          
          // ⭐⭐⭐ 트랜잭션 내부에서 throw한 Error를 HttpsError로 변환
          if (txError instanceof Error && !(txError instanceof HttpsError)) {
            // 트랜잭션 내부에서 throw한 일반 Error는 failed-precondition으로 변환
            if (txError.message.includes("참가 신청을 찾을 수 없습니다")) {
              throw new HttpsError("not-found", txError.message);
            }
            if (txError.message.includes("승인할 수 없는 상태") || txError.message.includes("승인자 정보")) {
              throw new HttpsError("failed-precondition", txError.message);
            }
          }
          
          // ⭐⭐⭐ 트랜잭션 충돌 에러인 경우에만 재시도
          // 🔥 핵심: Firestore gRPC ABORTED는 숫자 10으로 올 수 있음
          const isAborted = 
            txError?.code === "aborted" ||
            txError?.code === 10; // ✅ Firestore gRPC ABORTED (gRPC status code)
          
          const isRetryableError =
            isAborted ||
            txError?.message?.includes("transaction") ||
            txError?.message?.includes("concurrent") ||
            (txError?.code === "failed-precondition" && txError?.message?.includes("concurrent"));
          
          if (isRetryableError && attempt < MAX_RETRIES) {
            logger.warn("[approveApplication] 트랜잭션 충돌 - 재시도", {
              applicationId,
              attempt,
              maxRetries: MAX_RETRIES,
              errorCode: txError?.code,
              codeType: typeof txError?.code, // 🔥 디버깅: 숫자인지 문자열인지 확인
              errorMessage: txError?.message,
            });
            // 다음 시도로 계속
            continue;
          } else {
            // 재시도 불가능한 에러이거나 최대 재시도 횟수 초과
            // HttpsError는 그대로 throw, 일반 Error는 변환
            if (txError instanceof HttpsError) {
              throw txError;
            }
            throw new HttpsError("failed-precondition", txError?.message || "승인 처리 중 오류가 발생했습니다.");
          }
        }
      }
      
      // ⭐⭐⭐ 모든 재시도 실패 시 마지막 에러 throw
      if (lastError) {
        throw lastError;
      }

      // ⭐⭐⭐ 트랜잭션 밖: teams, payment 생성 (소프트 실패 처리)
      // 승인 상태 변경이 성공한 후에만 실행
      // ⭐⭐⭐ 핵심: 승인 성공 = application.status 트랜잭션 성공만
      // teams/payment/invite/opLogs/email은 모두 소프트 실패 (승인 자체는 성공)
      logger.info("[approveApplication] 트랜잭션 밖: teams/payment 생성 시작 (소프트 실패)", {
        applicationId,
      });

      // 3-2. teams 문서 생성 (대진표용) - create()로 레이스 컨디션 제거
      const teamId = `team_${applicationId}`;
      const teamRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/teams/${teamId}`
      );

      try {
        // ⭐⭐⭐ Firestore Admin SDK에는 create()가 없음 → get() 후 set() 사용
        const existingTeamDoc = await teamRef.get();
        if (existingTeamDoc.exists) {
          logger.info("[approveApplication] teams 이미 존재 (idempotent)", { teamId });
        } else {
          const teamData: any = {
            applicationId: applicationId,
            teamName: appData.teamName,
            managerName: appData.managerName || null,
            phone: appData.phone || null,
            seed: null,
            status: "APPROVED", // 🔥 팀 승인 상태
            captainUid: appData.teamManagerId || appData.createdBy || null, // 🔥 팀 대표 UID (팀원 등록 권한용)
            rosterOpen: true, // 🔥 팀원 등록 자동 오픈 (승인과 동시에 등록 가능)
            rosterOpenedAt: admin.firestore.FieldValue.serverTimestamp(), // 🔥 등록 오픈 시각
            rosterLocked: false, // 🔥 팀원 등록 잠금 상태 (기본값: false)
            rosterCount: 0, // 🔥 팀원 수 캐시 (기본값: 0)
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (!teamData.teamName) {
            logger.error("[approveApplication] ❌ teamData.teamName이 없음", { teamData, appData });
            throw new Error("팀 정보 생성 중 오류가 발생했습니다.");
          }

          // ⭐⭐⭐ set() 사용: 없을 때만 생성 (get()으로 확인 후)
          await teamRef.set(teamData);
          logger.info("[approveApplication] ✅ teams set 완료", { teamId });
        }
      } catch (teamError: any) {
        // ⭐⭐⭐ 소프트 실패: teams 생성 실패해도 승인은 성공
        logger.warn("[approveApplication] ⚠️ teams 생성 실패 (승인은 성공)", {
          errorCode: teamError?.code,
          errorMessage: teamError?.message,
          teamId,
        });
      }

      // 3-3. payment 문서 생성 (결제 관리용) - create()로 레이스 컨디션 제거
      const paymentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/payments/${applicationId}`
      );

      try {
        // ⭐⭐⭐ Firestore Admin SDK에는 create()가 없음 → get() 후 set() 사용
        const existingPaymentDoc = await paymentRef.get();
        if (existingPaymentDoc.exists) {
          logger.info("[approveApplication] payment 이미 존재 (idempotent)", {
            paymentId: paymentRef.id,
          });
        } else {
          // ⭐⭐⭐ feePolicy 기본값 수정: baseTeamCount 2 → 1 (UI와 일치)
          const feePolicy = appData.feePolicySnapshot || {
            baseFee: 200000,
            baseTeamCount: 1, // 🔥 수정: UI는 "1~1팀" 기준이므로 1로 변경
            extraFeePerTeam: 100000,
          };
          
          const teamCount = appData.teamCount || 1;
          const extraTeams = Math.max(teamCount - feePolicy.baseTeamCount, 0);
          const extraFee = extraTeams * feePolicy.extraFeePerTeam;
          const totalAmount = feePolicy.baseFee + extraFee;

          const paymentData: any = {
            applicationId: applicationId,
            associationId: associationId,
            competitionId: tournamentId,
            teamName: appData.teamName,
            amount: totalAmount,
            status: "ready",
            orderId: `app_${applicationId}`,
            method: null,
            paymentKey: null,
            receiptUrl: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // ⭐⭐⭐ set() 사용: 없을 때만 생성 (get()으로 확인 후)
          await paymentRef.set(paymentData);
          logger.info("[approveApplication] ✅ payment set 완료", { paymentId: paymentRef.id });
          
          // ⭐⭐⭐ 참가비 확정 저장 (application에 박제 - 단일 소스 오브 트루스)
          // 승인 시점에 계산된 참가비를 application에 저장하여 UI에서 일관되게 표시
          const applicationRef = db.doc(
            `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
          );
          
          // ⭐⭐⭐ application에 calculatedFee 박제 (이미 APPROVED 상태이므로 업데이트만)
          await applicationRef.update({
            calculatedFee: totalAmount, // 🔥 UI에서 이 값만 사용
            feePolicySnapshot: feePolicy, // 🔥 이미 있지만 확실히 저장
            teamCountSnapshot: teamCount, // 🔥 확정 팀 수 저장
          });
          
          logger.info("[approveApplication] ✅ 참가비 확정 저장", {
            applicationId,
            calculatedFee: totalAmount,
            teamCount,
            extraTeams,
          });
        }
      } catch (paymentError: any) {
        // ⭐⭐⭐ 소프트 실패: payment 생성 실패해도 승인은 성공
        logger.warn("[approveApplication] ⚠️ payment 생성 실패 (승인은 성공)", {
          errorCode: paymentError?.code,
          errorMessage: paymentError?.message,
          paymentId: paymentRef.id,
        });
      }

      // ⭐⭐⭐ 3-4. tournament.participantsCountApproved 업데이트 제거
      // 충돌 원인 제거: UI에서 approved applications count로 집계 표시
      // tournament 문서는 generateMatchesCallable과 충돌 가능성이 높으므로 완전 제거

      // 4. 팀원 초대 링크 자동 생성 (승인 시 자동 생성) - 소프트 실패
      let inviteId: string | null = null;
      let inviteLink: string | null = null;

      try {
        // 🔥 nanoid 대신 Firestore 자동 ID 사용 (더 안전)
        const invitesRef = db.collection("invites");
        const inviteDocRef = invitesRef.doc(); // 자동 ID 생성
        inviteId = inviteDocRef.id;

        // 만료 시간: 7일 후
        const expiresAt = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );

        // 최대 사용 횟수: 팀 수 × 15명 (팀당 최대 15명 가정)
        const maxUses = (appData.teamCount || 1) * 15;

        // 🔥 undefined 제거: invite 데이터 구성
        const inviteData: any = {
          applicationId: applicationId,
          associationId: associationId,
          tournamentId: tournamentId,
          role: "player", // 선수 초대
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: expiresAt,
          maxUses: maxUses,
          usedCount: 0,
          createdBy: uid,
          revoked: false,
        };

        await inviteDocRef.set(inviteData);

        // 초대 링크 생성 (프론트엔드 URL 기준)
        inviteLink = `/invite/${inviteId}`;

        logger.info("[approveApplication] ✅ 초대 링크 생성 완료", {
          inviteId,
          inviteLink,
          maxUses,
        });
      } catch (inviteError: any) {
        // ⭐⭐⭐ 소프트 실패: 초대 링크 생성 실패해도 승인은 성공
        logger.warn("[approveApplication] ⚠️ 초대 링크 생성 실패 (승인은 성공)", {
          errorCode: inviteError?.code,
          errorMessage: inviteError?.message,
          applicationId,
        });
      }

      console.log("✅ [approveApplication] 승인 완료:", {
        associationId,
        tournamentId,
        applicationId,
        approvedBy: uid,
        inviteId,
      });

      // 🔥 4. 승인 알림 자동 발송 (백그라운드 처리)
      void (async () => {
        try {
          // 대회 정보 조회 (대회명)
          const tournamentRef = db.doc(
            `associations/${associationId}/tournaments/${tournamentId}`
          );
          const tournamentSnap = await tournamentRef.get();
          const tournamentName = tournamentSnap.exists
            ? tournamentSnap.data()?.name || "대회"
            : "대회";

          // 팀장 이메일 주소 조회
          let teamManagerEmail: string | null = null;
          const teamManagerId = appData.teamManagerId || appData.createdBy;

          if (teamManagerId) {
            try {
              const userRecord = await auth.getUser(teamManagerId);
              teamManagerEmail = userRecord.email || null;
            } catch (authError: any) {
              console.warn("⚠️ [approveApplication] 팀장 이메일 조회 실패:", authError.message);
            }
          }

          // 이메일이 있으면 알림 발송
          if (teamManagerEmail) {
            const inviteUrl = inviteLink
              ? `https://yago.app${inviteLink}`
              : null;

            const subject = `[${tournamentName}] 참가 신청이 승인되었습니다`;
            const html = `
              <p>안녕하세요, ${appData.teamName} 팀장님.</p>
              <p>참가 신청이 승인되었습니다.</p>
              ${inviteUrl ? `
                <p>
                  <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                    👉 선수 명단 등록하기
                  </a>
                </p>
              ` : ""}
              <p>※ 선수 명단 등록은 승인 후에만 가능합니다.</p>
              <p>감사합니다.</p>
            `;
            const text = `
안녕하세요, ${appData.teamName} 팀장님.

참가 신청이 승인되었습니다.
${inviteUrl ? `아래 링크를 통해 선수 명단을 등록해 주세요.\n\n👉 선수 명단 등록하기: ${inviteUrl}` : ""}

※ 선수 명단 등록은 승인 후에만 가능합니다.

감사합니다.
            `;

            const sent = await sendEmail({
              to: teamManagerEmail,
              subject,
              html,
              text,
            });

            if (sent) {
              logger.info("[approveApplication] ✅ 승인 알림 발송 완료", {
                applicationId,
                teamManagerEmail,
              });
            } else {
              logger.warn("[approveApplication] ⚠️ 승인 알림 발송 실패 (sendEmail false)", {
                applicationId,
                teamManagerEmail,
              });
            }
          } else {
            logger.warn("[approveApplication] ⚠️ 팀장 이메일 주소 없어 알림 발송 건너뜀", {
              applicationId,
              teamManagerId,
            });
          }
        } catch (notificationError: any) {
          // 알림 실패는 경고만 (승인 자체는 성공)
          logger.warn("⚠️ [approveApplication] 승인 알림 발송 오류:", notificationError.message);
        }
      })();

      // 🔥 1단계: 즉시 응답 (속도 체감 개선)
      // 2단계: 운영 로그 기록은 백그라운드로 처리 (응답 지연 방지) - 소프트 실패
      void (async () => {
        try {
          const opLogsRef = db.collection(
            `associations/${associationId}/tournaments/${tournamentId}/opLogs`
          );
          await opLogsRef.add({
            ts: admin.firestore.FieldValue.serverTimestamp(),
            type: "APPLY_APPROVED",
            level: "info",
            actorUid: uid,
            actorRole: "admin",
            message: `참가 승인: ${appData.teamName}`,
            meta: {
              applicationId,
              teamId: `team_${applicationId}`,
              teamName: appData.teamName,
              inviteId: inviteId || null,
            },
          });
          logger.info("[approveApplication] ✅ 운영 로그 기록 완료");
        } catch (logError: any) {
          // ⭐⭐⭐ 소프트 실패: 로그 기록 실패해도 승인은 성공
          logger.warn("[approveApplication] ⚠️ 운영 로그 기록 실패 (승인은 성공)", {
            errorCode: logError?.code,
            errorMessage: logError?.message,
            applicationId,
          });
        }
      })();

      return {
        success: true,
        message: "참가 신청이 승인되었습니다.",
        inviteLink: inviteLink || null, // 초대 링크 반환 (선택)
        inviteId: inviteId || null,
      };
    } catch (error: any) {
      // 🔥 상세한 오류 로깅 (원인 확정용)
      logger.error("❌ [approveApplication] 오류 발생", {
        applicationId,
        associationId,
        tournamentId,
        uid,
        rawCode: error?.code, // 🔥 원본 코드 값
        codeType: typeof error?.code, // 🔥 숫자인지 문자열인지 확인 (10 vs "aborted")
        errorCode: error?.code,
        rawMessage: error?.message, // 🔥 원본 메시지
        errorMessage: error?.message,
        errorName: error?.name,
        errorStack: error?.stack?.substring(0, 500), // 🔥 스택은 일부만
        appData: appDataForError,
      });

      console.error("❌ [approveApplication] 오류:", {
        code: error?.code,
        codeType: typeof error?.code,
        message: error?.message,
        stack: error?.stack?.substring(0, 300),
      });

      // ⭐⭐⭐ 핵심: HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        logger.info("[approveApplication] HttpsError 전달", {
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      // 🔥 Firestore 에러를 적절한 HttpsError로 변환
      const firestoreErrorCode = error?.code || error?.errorInfo?.code;
      
      if (firestoreErrorCode === "permission-denied" || error?.message?.includes("permission")) {
        logger.warn("[approveApplication] 권한 오류", { firestoreErrorCode, errorMessage: error?.message });
        throw new HttpsError(
          "permission-denied",
          "권한이 없습니다. 관리자 권한을 확인해주세요."
        );
      }

      if (firestoreErrorCode === "not-found" || error?.message?.includes("not found")) {
        logger.warn("[approveApplication] 문서 없음", { firestoreErrorCode, errorMessage: error?.message });
        throw new HttpsError(
          "not-found",
          "참가 신청 또는 관련 정보를 찾을 수 없습니다."
        );
      }

      if (firestoreErrorCode === "failed-precondition" || error?.message?.includes("precondition")) {
        logger.warn("[approveApplication] 전제 조건 실패", { firestoreErrorCode, errorMessage: error?.message });
        throw new HttpsError(
          "failed-precondition",
          error?.message || "승인할 수 없는 상태입니다."
        );
      }

      if (firestoreErrorCode === "invalid-argument" || error?.message?.includes("invalid")) {
        logger.warn("[approveApplication] 잘못된 인자", { firestoreErrorCode, errorMessage: error?.message });
        throw new HttpsError(
          "invalid-argument",
          error?.message || "입력 정보가 올바르지 않습니다."
        );
      }

      // 🔥 트랜잭션 관련 에러 (동시성 충돌) - 재시도 로직에서 처리했지만, 여전히 실패한 경우
      // 🔥 핵심: Firestore gRPC ABORTED는 숫자 10으로 올 수 있음
      const isAbortedInCatch = 
        error?.code === "aborted" ||
        error?.code === 10; // ✅ Firestore gRPC ABORTED (gRPC status code)
      
      // ⭐⭐⭐ 핵심: failed-precondition은 aborted로 변환하지 않음 (별도 처리)
      const isTransactionError =
        isAbortedInCatch ||
        error?.message?.includes("transaction") ||
        error?.message?.includes("concurrent");
      // ❌ error?.code === "failed-precondition" 제거 (별도 처리)
      
      // ⭐⭐⭐ failed-precondition은 그대로 전달 (이미 처리됨, 대진표 생성됨 등)
      if (error?.code === "failed-precondition") {
        logger.warn("[approveApplication] failed-precondition (별도 처리)", {
          errorCode: error?.code,
          errorMessage: error?.message,
          applicationId,
        });
        throw new HttpsError(
          "failed-precondition",
          error?.message || "승인할 수 없는 상태입니다."
        );
      }
      
      if (isTransactionError) {
        logger.warn("[approveApplication] 트랜잭션/동시성 오류 (재시도 후에도 실패)", { 
          errorCode: error?.code,
          codeType: typeof error?.code, // 🔥 디버깅: 숫자인지 문자열인지 확인
          rawCode: error?.code, // 🔥 원본 코드 값
          errorMessage: error?.message,
          rawMessage: error?.message, // 🔥 원본 메시지
          applicationId,
          tournamentId,
          errorStack: error?.stack?.substring(0, 500),
        });
        
        // ⭐⭐⭐ 최종 Idempotent 체크 1: tournament 상태 확인 (대진표 생성 중일 수 있음)
        try {
          const finalTournamentSnap = await tournamentRef.get();
          if (finalTournamentSnap.exists) {
            const finalTournamentData = finalTournamentSnap.data()!;
            const finalTournamentStatus = finalTournamentData?.status?.toUpperCase();
            
            if (finalTournamentStatus === "MATCHES_GENERATED" || 
                finalTournamentData?.bracket?.locked === true) {
              logger.info("[approveApplication] ✅ 최종 재확인: 대진표 생성 완료 (idempotent 차단)", {
                applicationId,
                tournamentStatus: finalTournamentData?.status,
              });
              throw new HttpsError(
                "failed-precondition",
                "대진표가 이미 생성되었습니다. 승인을 할 수 없습니다."
              );
            }
          }
        } catch (tournamentCheckError) {
          if (tournamentCheckError instanceof HttpsError) {
            throw tournamentCheckError;
          }
          logger.warn("[approveApplication] 최종 tournament 재확인 실패", { tournamentCheckError });
        }
        
        // ⭐⭐⭐ 최종 Idempotent 체크 2: 이미 승인되었을 가능성 체크
        if (appRef) {
          try {
            const recheckDoc = await appRef.get();
            if (recheckDoc.exists) {
              const recheckStatus = recheckDoc.data()?.status?.toUpperCase();
              if (recheckStatus === "APPROVED") {
                logger.info("[approveApplication] ✅ 최종 재확인: 이미 승인됨 (idempotent 성공)", {
                  applicationId,
                });
                return {
                  success: true,
                  message: "이미 승인된 신청입니다.",
                  alreadyApproved: true,
                };
              }
            }
          } catch (recheckError) {
            // 재확인 실패는 무시하고 원래 에러 전달
            logger.warn("[approveApplication] 최종 재확인 실패", { recheckError });
          }
        }
        
        // ⭐⭐⭐ 사용자 친화적 메시지 (재시도 후에도 실패한 경우)
        // 🔥 진짜 aborted만 aborted로 변환 (failed-precondition은 위에서 이미 처리됨)
        if (isAbortedInCatch || error?.message?.includes("transaction") || error?.message?.includes("concurrent")) {
          throw new HttpsError(
            "aborted",
            "다른 작업과 충돌이 발생했습니다. 잠시 후 다시 시도해주세요."
          );
        }
        
        // ⭐⭐⭐ 여기 도달했다면 예상치 못한 에러
        throw new HttpsError(
          "internal",
          error?.message || "승인 처리 중 오류가 발생했습니다."
        );
      }

      // 🔥 알 수 없는 에러는 internal로 감싸서 전달 (에러 메시지 포함)
      logger.error("[approveApplication] 알 수 없는 오류", {
        errorCode: firestoreErrorCode,
        errorMessage: error?.message,
        errorName: error?.name,
        errorStack: error?.stack?.substring(0, 500), // 스택은 일부만
      });

      throw new HttpsError(
        "internal",
        `승인 처리 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}`
      );
    }
  }
);

