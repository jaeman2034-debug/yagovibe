/**
 * 🔥 참가 신청 상태 변경 (거절/보류)
 * 
 * 승인은 approveApplicationCallable 사용
 * 거절/보류만 이 함수 사용
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { sendEmail } from "../notifications/emailSender";
import { logger } from "firebase-functions";
import { updateApprovedCountOnStatusChange } from "./utils/tournamentStats";

const db = admin.firestore();
const auth = admin.auth();

export const updateApplicationStatusCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { associationId, tournamentId, applicationId, status, reason } = request.data || {};

    if (!associationId || !tournamentId || !applicationId || !status) {
      throw new HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    if (status !== "REJECTED" && status !== "HOLD") {
      throw new HttpsError(
        "invalid-argument",
        "status는 REJECTED 또는 HOLD만 가능합니다."
      );
    }

    const uid = request.auth.uid;

    // 🔥 가드: uid가 없으면 즉시 종료 (방어 코드)
    if (!uid || typeof uid !== "string") {
      logger.error("[updateApplicationStatus] uid가 유효하지 않음", { uid });
      throw new HttpsError(
        "internal",
        "인증 정보가 유효하지 않습니다."
      );
    }

    try {
      // 관리자 권한 확인
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

      // 신청 상태 업데이트
      const appRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
      );

      // 🔥 현재 상태 확인 (APPROVED → REJECTED 전환 감지용)
      const appSnap = await appRef.get();
      if (!appSnap.exists) {
        throw new HttpsError("not-found", "참가 신청을 찾을 수 없습니다.");
      }
      const currentAppData = appSnap.data()!;
      const currentStatus = currentAppData.status?.toUpperCase();
      const isApprovedToRejected = currentStatus === "APPROVED" && status === "REJECTED";

      // 🔥 undefined 제거: reason이 있을 때만 포함
      const updateData: any = {
        status: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // REJECTED인 경우 rejectedAt, rejectedReason, rejectedBy 추가
      if (status === "REJECTED") {
        updateData.rejectedAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.rejectedBy = uid; // 🔥 uid는 위에서 검증됨
        if (reason && reason.trim()) {
          updateData.rejectedReason = reason.trim();
        }
      }

      // 🔥 디버깅: 업데이트 payload 확인 (undefined 체크)
      const debugPayload = JSON.parse(JSON.stringify(updateData));
      
      // 🔥 undefined 체크
      if (status === "REJECTED" && (debugPayload.rejectedBy === undefined || debugPayload.rejectedBy === null)) {
        logger.error("[updateApplicationStatus] ❌ rejectedBy가 undefined/null", { uid, debugPayload });
        throw new HttpsError("internal", "반려자 정보가 유효하지 않습니다.");
      }
      
      console.log("[updateApplicationStatus] ✅ 업데이트 payload:", debugPayload);

      // 🔥 트랜잭션으로 원자적 처리 (APPROVED → REJECTED 전환 시 stats 업데이트 포함)
      if (isApprovedToRejected) {
        await db.runTransaction(async (tx) => {
          // 🔥 Stats 업데이트: APPROVED → REJECTED
          await updateApprovedCountOnStatusChange(
            tx,
            associationId,
            tournamentId,
            "APPROVED",
            "REJECTED"
          );
          
          // 🔥 Application 상태 업데이트
          tx.update(appRef, updateData);
        });
        
        logger.info("[updateApplicationStatus] ✅ APPROVED → REJECTED 전환 완료 (Stats 업데이트 포함)", {
          applicationId,
          associationId,
          tournamentId,
        });
      } else {
        // 🔥 일반 상태 변경 (트랜잭션 불필요)
        await appRef.update(updateData);
      }

      // 🔥 반려 알림 자동 발송 (REJECTED인 경우만, 백그라운드 처리)
      if (status === "REJECTED") {
        void (async () => {
          try {
            // 신청 정보 재조회
            const appDocAfter = await appRef.get();
            if (!appDocAfter.exists) return;

            const appData = appDocAfter.data()!;

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
                logger.warn("⚠️ [updateApplicationStatus] 팀장 이메일 조회 실패:", authError.message);
              }
            }

            // 이메일이 있으면 알림 발송
            if (teamManagerEmail) {
              const rejectedReason = updateData.rejectedReason || "사유 없음";

              const subject = `[${tournamentName}] 참가 신청이 반려되었습니다`;
              const html = `
                <p>안녕하세요, ${appData.teamName} 팀장님.</p>
                <p>참가 신청이 반려되었습니다.</p>
                <p><strong>사유:</strong></p>
                <p>${rejectedReason.replace(/\n/g, "<br>")}</p>
                <p>문의 사항은 협회로 연락 주세요.</p>
                <p>감사합니다.</p>
              `;
              const text = `
안녕하세요, ${appData.teamName} 팀장님.

참가 신청이 반려되었습니다.

사유:
${rejectedReason}

문의 사항은 협회로 연락 주세요.

감사합니다.
              `;

              const sent = await sendEmail({
                to: teamManagerEmail,
                subject,
                html,
                text,
              });

              if (sent) {
                logger.info("[updateApplicationStatus] ✅ 반려 알림 발송 완료", {
                  applicationId,
                  teamManagerEmail,
                });
              } else {
                logger.warn("[updateApplicationStatus] ⚠️ 반려 알림 발송 실패 (sendEmail false)", {
                  applicationId,
                  teamManagerEmail,
                });
              }
            } else {
              logger.warn("[updateApplicationStatus] ⚠️ 팀장 이메일 주소 없어 알림 발송 건너뜀", {
                applicationId,
                teamManagerId,
              });
            }
          } catch (notificationError: any) {
            // 알림 실패는 경고만 (반려 자체는 성공)
            logger.warn("⚠️ [updateApplicationStatus] 반려 알림 발송 오류:", notificationError.message);
          }
        })();
      }

      return {
        success: true,
        message: `신청 상태가 ${status === "REJECTED" ? "거절" : "보류"}로 변경되었습니다.`,
      };
    } catch (error: any) {
      console.error("❌ [updateApplicationStatus] 오류:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `상태 변경 중 오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`
      );
    }
  }
);

