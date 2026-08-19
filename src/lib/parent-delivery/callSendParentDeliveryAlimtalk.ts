import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { ParentDeliveryLog } from "@/lib/parent-delivery/parentDeliveryTypes";

export type SendParentDeliveryAlimtalkPayload = {
  teamId: string;
  playerId: string;
  sessionId: string;
  displayName: string;
};

export type SendParentDeliveryAlimtalkResponse = {
  configured: boolean;
  skipped?: boolean;
  reason?: string;
  deliveryId?: string;
  status?: "sent" | "failed";
  providerMessageId?: string;
  error?: string;
};

export async function callSendParentDeliveryAlimtalk(
  payload: SendParentDeliveryAlimtalkPayload
): Promise<SendParentDeliveryAlimtalkResponse> {
  const fn = httpsCallable<
    SendParentDeliveryAlimtalkPayload,
    SendParentDeliveryAlimtalkResponse
  >(functions, "sendParentDeliveryAlimtalk");
  const res = await fn(payload);
  return res.data;
}

export function alimtalkResponseToLog(
  payload: SendParentDeliveryAlimtalkPayload & { shareUrl: string; triggeredByUid: string },
  response: SendParentDeliveryAlimtalkResponse
): ParentDeliveryLog {
  return {
    schemaVersion: 1,
    deliveryId: response.deliveryId ?? "",
    teamId: payload.teamId,
    playerId: payload.playerId,
    sessionId: payload.sessionId,
    channel: "kakao",
    status: response.status ?? "failed",
    shareUrl: payload.shareUrl,
    sentAt: response.status === "sent" ? Date.now() : null,
    error: response.error ?? null,
    triggeredByUid: payload.triggeredByUid,
    createdAt: Date.now(),
    provider: "kakao_alimtalk",
    providerMessageId: response.providerMessageId,
  };
}
