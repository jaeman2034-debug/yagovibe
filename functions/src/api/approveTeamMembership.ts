/**
 * approveTeamMembership
 * 팀 회원 승인 (협회 관리자 전용)
 * 
 * 역할:
 * - 팀 상태 변경: PENDING → MEMBER
 * - 팀의 associationId 설정
 * - membership_conversions 문서 업데이트 (status: APPROVED, approvedAt 설정)
 * - 감사 로그 기록 (승인자, 승인 시각)
 * - 권한 즉시 반영 (Policy Engine이 다음 요청부터 MEMBER로 인식)
 * 
 * 보안:
 * - 협회 관리자만 호출 가능 (추후 권한 체크 추가)
 * - 트랜잭션으로 원자성 보장
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

const db = getFirestore();

interface ApproveTeamMembershipRequest {
  teamId: string;
  associationId: string;
}

interface ApproveTeamMembershipResponse {
  success: boolean;
  message: string;
}

export const approveTeamMembership = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<ApproveTeamMembershipResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [approveTeamMembership] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { teamId, associationId } = data as ApproveTeamMembershipRequest;
    const approverUid = auth.uid;

    // 2️⃣ 입력 검증
    if (!teamId || !associationId) {
      throw new HttpsError(
        "invalid-argument",
        "teamId와 associationId가 필요합니다."
      );
    }

    logger.info("🔥 [approveTeamMembership] 회원 승인 시작", {
      approverUid,
      teamId,
      associationId,
    });

    // 3️⃣ 트랜잭션으로 승인 처리
    try {
      await db.runTransaction(async (transaction) => {
        // 3-1. 팀 문서 조회 및 업데이트
        const teamRef = db.doc(`teams/${teamId}`);
        const teamSnap = await transaction.get(teamRef);

        if (!teamSnap.exists) {
          throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
        }

        const teamData = teamSnap.data()!;

        // 현재 상태 확인
        // teams.status는 TeamStatus enum (MEMBER/NON_MEMBER/ACADEMY/PENDING)
        const currentStatus = teamData.status || "NON_MEMBER";
        const currentAssociationId = teamData.associationId || null;

        // 이미 MEMBER인 경우 체크
        if (currentStatus === "MEMBER" && currentAssociationId === associationId) {
          logger.warn("⚠️ [approveTeamMembership] 이미 회원팀입니다", { teamId });
          throw new HttpsError(
            "already-exists",
            "이미 회원팀으로 등록되어 있습니다."
          );
        }

        // 3-2. 팀 상태 업데이트 (MEMBER, associationId 설정)
        // Policy Engine이 teamData.status를 TeamStatus로 읽으므로 status 필드 사용
        transaction.update(teamRef, {
          status: "MEMBER", // TeamStatus enum
          associationId, // 협회 ID
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info("✅ [approveTeamMembership] 팀 상태 업데이트", {
          teamId,
          fromStatus: currentStatus,
          toStatus: "MEMBER",
          associationId,
        });

        // 3-3. membershipRequests 문서 업데이트 (노원 실전: 승인 히스토리)
        // associationId + teamId 조합으로 찾기
        const requestsQuery = db
          .collection("membershipRequests")
          .where("teamId", "==", teamId)
          .where("associationId", "==", associationId)
          .where("status", "==", "pending")
          .limit(1);

        const requestsSnap = await transaction.get(requestsQuery);

        if (!requestsSnap.empty) {
          const requestDoc = requestsSnap.docs[0];
          transaction.update(requestDoc.ref, {
            status: "approved",
            reviewedAt: FieldValue.serverTimestamp(),
            reviewedBy: approverUid,
          });

          logger.info("✅ [approveTeamMembership] 신청 문서 업데이트", {
            requestId: requestDoc.id,
          });
        } else {
          // 신청 문서가 없으면 생성 (수동 승인 케이스 대비)
          logger.warn("⚠️ [approveTeamMembership] 신청 문서 없음, 생성", {
            teamId,
            associationId,
          });
          
          const newConversionRef = db.collection("membership_conversions").doc();
          transaction.set(newConversionRef, {
            teamId,
            associationId,
            status: "APPROVED",
            requestedAt: FieldValue.serverTimestamp(),
            approvedAt: FieldValue.serverTimestamp(),
            approvedBy: approverUid,
            createdAt: FieldValue.serverTimestamp(),
          });
        }

        // 3-4. 감사 로그 기록
        const auditLogRef = db.collection("audit_logs").doc();
        transaction.set(auditLogRef, {
          entityType: "team",
          entityId: teamId,
          action: "MEMBERSHIP_APPROVED",
          metadata: {
            associationId,
            fromStatus: currentStatus,
            toStatus: "MEMBER",
            approvedBy: approverUid,
          },
          createdBy: approverUid,
          createdAt: FieldValue.serverTimestamp(),
        });

        logger.info("✅ [approveTeamMembership] 감사 로그 기록", {
          auditLogId: auditLogRef.id,
        });
      });

      // 🔥 4️⃣ 팀 전체 멤버에게 협회 가입 완료 알림 발송 (트랜잭션 외부)
      try {
        // 팀 정보 조회 (팀명, 협회명)
        const teamRef = db.doc(`teams/${teamId}`);
        const teamSnap = await teamRef.get();
        const teamData = teamSnap.data();
        const teamName = teamData?.name || "팀";

        const associationRef = db.doc(`associations/${associationId}`);
        const associationSnap = await associationRef.get();
        const associationData = associationSnap.data();
        const associationName = associationData?.name || "협회";

        // 팀 멤버 조회
        const membersRef = db.collection(`teams/${teamId}/members`);
        const membersSnap = await membersRef.get();

        // 🔥 알림 설정 확인 유틸리티 import
        const { shouldSendNotification } = await import("../utils/notificationSettings");

        // 각 멤버에게 알림 생성
        const notificationPromises = membersSnap.docs.map(async (memberDoc) => {
          const memberData = memberDoc.data();
          const memberUid = memberDoc.id;

          // 알림 설정 확인
          const canSend = await shouldSendNotification(memberUid, "ASSOCIATION_JOINED");
          
          if (!canSend) {
            logger.info("⏭️ [approveTeamMembership] 사용자 알림 설정 OFF, 알림 스킵", {
              memberUid,
              teamId,
            });
            return; // 알림 스킵
          }

          const notificationRef = db.collection("notifications").doc();
          return notificationRef.set({
            userId: memberUid,
            type: "ASSOCIATION_JOINED",
            teamId,
            associationId,
            message: `🏆 우리 팀이 ${associationName}에 가입했어요! 이제 공식 리그와 대회에 참여할 수 있어요.`,
            link: `/teams/${teamId}`, // 🔥 팀 페이지로 이동
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
          });
        });

        await Promise.all(notificationPromises);

        logger.info("✅ [approveTeamMembership] 팀 전체 멤버에게 알림 발송 완료", {
          teamId,
          memberCount: membersSnap.size,
        });
      } catch (notificationError: any) {
        // 알림 실패는 비즈니스 로직에 영향 없음 (Fail-safe)
        logger.warn("⚠️ [approveTeamMembership] 알림 발송 실패 (무시)", {
          error: notificationError.message,
          teamId,
        });
      }

      logger.info("✅ [approveTeamMembership] 회원 승인 완료", {
        teamId,
        associationId,
        approverUid,
      });

      return {
        success: true,
        message: "회원 승인이 완료되었습니다.",
      };
    } catch (error: any) {
      logger.error("❌ [approveTeamMembership] 회원 승인 실패", {
        error: error.message,
        teamId,
        associationId,
      });

      // HttpsError는 그대로 재던지기
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `회원 승인 처리 중 오류가 발생했습니다: ${error.message}`
      );
    }
  }
);

