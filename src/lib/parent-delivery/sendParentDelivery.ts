import { auth } from "@/lib/firebase";
import {
  createParentDeliveryLog,
  updateParentDeliveryLogStatus,
} from "@/lib/parent-delivery/parentDeliveryLogs";
import { readParentDeliverySettings, shouldAutoSendParentDelivery } from "@/lib/parent-delivery/parentDeliverySettings";
import {
  alimtalkResponseToLog,
  callSendParentDeliveryAlimtalk,
} from "@/lib/parent-delivery/callSendParentDeliveryAlimtalk";
import type {
  ParentDeliveryLog,
  ParentDeliverySendChannel,
} from "@/lib/parent-delivery/parentDeliveryTypes";

export type SendParentDeliveryInput = {
  teamId: string;
  playerId: string;
  sessionId: string;
  shareUrl: string;
  clipText: string;
  channel?: ParentDeliverySendChannel;
  /** auto = settings.sendChannel when not manual */
  mode?: "manual" | "auto";
};

export type SendParentDeliveryResult = {
  log: ParentDeliveryLog;
  skipped: boolean;
  reason?: string;
};

/** v2 Phase 1 — Mock provider (console + deliveryLogs). v2.1 = Kakao AlimTalk. */
export async function sendParentDelivery(
  input: SendParentDeliveryInput
): Promise<SendParentDeliveryResult> {
  const uid = auth.currentUser?.uid ?? "unknown";
  let channel = input.channel ?? "kakao";

  if (input.mode === "auto") {
    const settings = await readParentDeliverySettings(input.teamId);
    if (!shouldAutoSendParentDelivery(settings)) {
      return {
        skipped: true,
        reason: "auto_send_disabled",
        log: {
          schemaVersion: 1,
          deliveryId: "",
          teamId: input.teamId,
          playerId: input.playerId,
          sessionId: input.sessionId,
          channel: settings.sendChannel,
          status: "failed",
          shareUrl: input.shareUrl,
          sentAt: null,
          error: "auto_send_disabled",
          triggeredByUid: uid,
          createdAt: Date.now(),
          provider: "mock",
        },
      };
    }
    channel = settings.sendChannel;
  }

  const log = await createParentDeliveryLog({
    teamId: input.teamId,
    playerId: input.playerId,
    sessionId: input.sessionId,
    channel,
    shareUrl: input.shareUrl,
    triggeredByUid: uid,
    status: "queued",
  });

  try {
    console.info("[ParentDelivery] mock send", {
      deliveryId: log.deliveryId,
      teamId: input.teamId,
      playerId: input.playerId,
      sessionId: input.sessionId,
      channel,
      shareUrl: input.shareUrl,
      clipPreview: input.clipText.slice(0, 120),
    });

    const sentAt = Date.now();
    await updateParentDeliveryLogStatus(input.teamId, log.deliveryId, "sent", { sentAt });

    return {
      log: { ...log, status: "sent", sentAt, error: null },
      skipped: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "send_failed";
    await updateParentDeliveryLogStatus(input.teamId, log.deliveryId, "failed", {
      error: message,
    });
    return {
      log: { ...log, status: "failed", error: message },
      skipped: false,
    };
  }
}

/** Step5 저장 후 — settings.autoSendEnabled 시 AlimTalk(CF) 또는 Mock 자동 발송 */
export async function maybeAutoSendParentDelivery(input: {
  teamId: string;
  playerId: string;
  sessionId: string;
  shareUrl: string;
  clipText: string;
  displayName?: string;
}): Promise<SendParentDeliveryResult | null> {
  const settings = await readParentDeliverySettings(input.teamId);
  if (!shouldAutoSendParentDelivery(settings)) return null;

  const uid = auth.currentUser?.uid ?? "unknown";
  const displayName = input.displayName ?? "";

  try {
    const alimtalk = await callSendParentDeliveryAlimtalk({
      teamId: input.teamId,
      playerId: input.playerId,
      sessionId: input.sessionId,
      displayName,
    });

    if (alimtalk.configured && !alimtalk.skipped) {
      const log = alimtalkResponseToLog(
        {
          ...input,
          displayName,
          triggeredByUid: uid,
        },
        alimtalk
      );
      return {
        log,
        skipped: false,
        reason: alimtalk.status === "failed" ? alimtalk.error : undefined,
      };
    }
  } catch (error) {
    console.warn("[ParentDelivery] alimtalk callable failed — mock fallback", error);
  }

  return sendParentDelivery({
    ...input,
    mode: "auto",
  });
}
