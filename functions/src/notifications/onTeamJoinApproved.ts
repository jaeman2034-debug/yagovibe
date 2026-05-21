/**
 * teamJoinRequests 승인(pending → approved) 시 활동 로그만 기록.
 *
 * 인앱 알림 + FCM: approveTeamJoinRequest Callable이 notifications 문서를 생성하고,
 * sendPushOnNotificationCreate 가 FCM을 발송한다 (중복 방지).
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";

interface TeamJoinRequest {
  teamId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
}

export const onTeamJoinApproved = onDocumentUpdated(
  {
    region: "asia-northeast3",
    document: "teamJoinRequests/{requestId}",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const requestId = event.params.requestId as string;
    const before = event.data?.before?.data() as TeamJoinRequest | undefined;
    const after = event.data?.after?.data() as TeamJoinRequest | undefined;

    if (!before || !after || before.status !== "pending" || after.status !== "approved") {
      return;
    }

    if ((after as { notified?: boolean }).notified === true) {
      logger.info("[onTeamJoinApproved] skip (already notified flag)", { requestId });
      return;
    }

    const { userId, teamId } = after;

    try {
      const teamSnap = await db.doc(`teams/${teamId}`).get();
      const teamName = teamSnap.exists ? teamSnap.data()?.name : "팀";

      const activityLogRef = db.collection("activityLogs").doc();
      await activityLogRef.set({
        userId,
        category: "TEAM",
        action: "JOINED_TEAM",
        context: {
          teamId,
          teamName,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.doc(`teamJoinRequests/${requestId}`).update({
        notified: true,
      });

      logger.info("[onTeamJoinApproved] activity log ok", {
        requestId,
        userId,
        teamId,
        activityLogId: activityLogRef.id,
      });
    } catch (error: unknown) {
      logger.error("[onTeamJoinApproved] error", {
        requestId,
        userId,
        teamId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
