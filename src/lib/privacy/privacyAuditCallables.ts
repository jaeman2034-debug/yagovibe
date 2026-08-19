import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type ClientPrivacyAuditEventType = "COACH_APPROVED" | "PDF_GENERATED";

export type RecordPrivacyAuditEventPayload = {
  teamId: string;
  eventType: ClientPrivacyAuditEventType;
  mediaId?: string;
  storagePath?: string;
  detail?: Record<string, unknown>;
};

/** Best-effort — Growth MVP must not fail if callable unavailable */
export async function callRecordPrivacyAuditEvent(
  payload: RecordPrivacyAuditEventPayload
): Promise<void> {
  try {
    const fn = httpsCallable<RecordPrivacyAuditEventPayload, { ok: boolean }>(
      functions,
      "recordPrivacyAuditEvent"
    );
    await fn(payload);
  } catch (error) {
    console.warn("[privacyAudit] client log skipped", error);
  }
}
