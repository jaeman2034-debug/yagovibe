/**
 * team_games 가 완료될 때 플레이 피드백 유도 알림(notifications)을 생성합니다.
 * sendPushOnNotificationCreate 가 같은 문서로 FCM을 발송합니다.
 * 중복 발송 방지: playMatchFeedbackPromptMarkers/{gameId}_{teamId} 트랜잭션
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

const REGION = "asia-northeast3";
const BATCH_SAFE = 400;

async function acquirePromptMarker(db: FirebaseFirestore.Firestore, gameId: string, teamId: string): Promise<boolean> {
  const { FieldValue } = await import("firebase-admin/firestore");
  const markerRef = db.collection("playMatchFeedbackPromptMarkers").doc(`${gameId}_${teamId}`);
  let acquired = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(markerRef);
    if (snap.exists) return;
    acquired = true;
    tx.set(markerRef, {
      gameId,
      teamId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return acquired;
}

async function listActiveUidRecipients(db: FirebaseFirestore.Firestore, teamId: string): Promise<string[]> {
  const snap = await db.collection("teams").doc(teamId).collection("members").where("status", "==", "active").get();
  const ids: string[] = [];
  snap.forEach((d) => {
    const raw = d.data() as { isDeleted?: boolean; userId?: string };
    if (raw.isDeleted === true) return;
    const uid = typeof raw.userId === "string" ? raw.userId.trim() : "";
    if (uid) ids.push(uid);
  });
  return Array.from(new Set(ids));
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export const onTeamGameCompletedPlayFeedbackPush = onDocumentUpdated(
  {
    region: REGION,
    document: "team_games/{gameId}",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;

    const gameId = String(event.params.gameId || "");
    if (!gameId) return;

    const beforeRaw = event.data?.before?.data() as Record<string, unknown> | undefined;
    const afterRaw = event.data?.after?.data() as Record<string, unknown> | undefined;
    if (!beforeRaw || !afterRaw) return;

    const beforeStatus = str(beforeRaw.status);
    const afterStatus = str(afterRaw.status);
    if (beforeStatus === "completed" || afterStatus !== "completed") return;

    const homeTeamId = str(afterRaw.homeTeamId);
    const awayTeamId = str(afterRaw.awayTeamId);
    if (!homeTeamId || !awayTeamId) return;

    const homeName = str(afterRaw.homeTeamName);
    const awayName = str(afterRaw.awayTeamName);
    const label =
      homeName && awayName ? `${homeName} vs ${awayName}` : homeName || awayName || "방금 종료된 경기";

    const sendForTeam = async (teamId: string) => {
      const acquired = await acquirePromptMarker(db, gameId, teamId);
      if (!acquired) {
        logger.info("[onTeamGameCompletedPlayFeedbackPush] skip duplicate marker", { gameId, teamId });
        return;
      }

      const recipients = await listActiveUidRecipients(db, teamId);
      if (recipients.length === 0) {
        logger.info("[onTeamGameCompletedPlayFeedbackPush] no linked members", { gameId, teamId });
        return;
      }

      const link = `/teams/${encodeURIComponent(teamId)}/manage?tab=play&matchId=${encodeURIComponent(gameId)}`;
      const title = "오늘 경기 평가해 주세요";
      const body = `${label}. 플레이 탭에서 한 줄 피드백을 남겨 주세요.`;

      for (let offset = 0; offset < recipients.length; offset += BATCH_SAFE) {
        const slice = recipients.slice(offset, offset + BATCH_SAFE);
        const batch = db.batch();
        for (const uid of slice) {
          const ref = db.collection("notifications").doc();
          batch.set(ref, {
            userId: uid,
            targetUid: uid,
            teamId,
            type: "MATCH_COMPLETED",
            title,
            message: body,
            body,
            link,
            pushDedupKey: `play_match_fb_prompt_v1_${gameId}_${teamId}_${uid}`,
            status: "queued",
            isRead: false,
            payload: {
              kind: "play_match_feedback_prompt",
              matchId: gameId,
            },
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        await batch.commit();
      }

      logger.info("[onTeamGameCompletedPlayFeedbackPush] queued notifications", {
        gameId,
        teamId,
        recipients: recipients.length,
      });
    };

    await sendForTeam(homeTeamId);
    await sendForTeam(awayTeamId);
  }
);
