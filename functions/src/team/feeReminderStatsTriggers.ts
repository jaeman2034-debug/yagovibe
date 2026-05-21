import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { rebuildFeeReminderStats } from "../lib/feeReminderConversionStats";

if (!admin.apps.length) {
  admin.initializeApp();
}

/** 회비 payment 변경 시 해당 feeId 집계 갱신 */
export const onTeamFeePaymentWriteRefreshFeeReminderStats = onDocumentWritten(
  {
    document: "teams/{teamId}/payments/{paymentId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const teamId = String(event.params.teamId || "");
    const before = event.data?.before.exists ? event.data.before.data() : null;
    const after = event.data?.after.exists ? event.data.after.data() : null;
    const ids = new Set<string>();
    const fa = after as Record<string, unknown> | null;
    const fb = before as Record<string, unknown> | null;
    const a = fa && typeof fa.feeId === "string" ? fa.feeId.trim() : "";
    const b = fb && typeof fb.feeId === "string" ? fb.feeId.trim() : "";
    if (a) ids.add(a);
    if (b) ids.add(b);
    for (const feeId of ids) {
      if (!feeId) continue;
      try {
        await rebuildFeeReminderStats(teamId, feeId);
      } catch (e) {
        logger.error("[onTeamFeePaymentWriteRefreshFeeReminderStats] failed", {
          teamId,
          feeId,
          error: String(e),
        });
      }
    }
  }
);

/** 스케줄 마감 전 알림 문서 생성 시 집계 갱신 (미납 인원 수 변화 반영) */
export const onFeeDueReminderNotificationCreatedRefreshFeeReminderStats = onDocumentCreated(
  {
    document: "notifications/{notificationId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const d = event.data?.data() as Record<string, unknown> | undefined;
    if (!d || String(d.type || "") !== "fee_due_reminder") return;
    const teamId = String(d.teamId || "").trim();
    const feeId = String(d.feeId || "").trim();
    if (!teamId || !feeId) return;
    try {
      await rebuildFeeReminderStats(teamId, feeId);
    } catch (e) {
      logger.error("[onFeeDueReminderNotificationCreatedRefreshFeeReminderStats] failed", {
        teamId,
        feeId,
        error: String(e),
      });
    }
  }
);
