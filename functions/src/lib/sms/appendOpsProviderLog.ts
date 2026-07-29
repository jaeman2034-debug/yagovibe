/**
 * PR4-3 prep — Append-only provider call logs.
 * Path: federations/{slug}/opsProviderLogs/{autoId}
 */

import type { Firestore, DocumentReference } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

function maskPhone(phone: string | null | undefined): string | null {
  const d = String(phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length < 7) return "***";
  return `${d.slice(0, 3)}****${d.slice(-4)}`;
}

export async function appendOpsProviderLog(
  db: Firestore,
  input: {
    federationSlug: string;
    notificationId?: string | null;
    provider: string;
    providerMode: "stub" | "sens" | "kakao";
    dryRun: boolean;
    toPhone?: string | null;
    templateKey?: string | null;
    requestAt: string;
    responseAt: string;
    latencyMs: number;
    httpStatus?: number | null;
    providerMessageId?: string | null;
    ok: boolean;
    errorCode?: string | null;
    errorMessage?: string | null;
  }
): Promise<DocumentReference> {
  const ref = db
    .collection("federations")
    .doc(input.federationSlug)
    .collection("opsProviderLogs")
    .doc();
  await ref.set({
    schemaVersion: 1,
    federationSlug: input.federationSlug,
    notificationId: input.notificationId || null,
    provider: input.provider,
    providerMode: input.providerMode,
    dryRun: input.dryRun === true,
    toPhoneMasked: maskPhone(input.toPhone),
    templateKey: input.templateKey || null,
    requestAt: input.requestAt,
    responseAt: input.responseAt,
    latencyMs: input.latencyMs,
    httpStatus: input.httpStatus ?? null,
    providerMessageId: input.providerMessageId || null,
    ok: input.ok === true,
    errorCode: input.errorCode || null,
    errorMessage: input.errorMessage || null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref;
}
