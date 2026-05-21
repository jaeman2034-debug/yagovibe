/**
 * 공개 카피 필드 단위 되돌리기 — edited.* 삭제 → generated 값으로 복귀
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { parseV2OrMigrate } from "./teamAiProfileV2";

const REGION = "asia-northeast3";

const ALLOWED = ["description", "highlights", "recruitMessage", "captainMessage"] as const;
type PublicField = (typeof ALLOWED)[number];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export const revertTeamPublicField = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  const fieldRaw = typeof d.field === "string" ? d.field.trim() : "";
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
  if (!ALLOWED.includes(fieldRaw as PublicField)) {
    throw new HttpsError(
      "invalid-argument",
      "field는 description | highlights | recruitMessage | captainMessage 중 하나여야 합니다."
    );
  }
  const field = fieldRaw as PublicField;

  const firestore = getFirestore();
  const teamRef = firestore.collection("teams").doc(teamId);
  const snap = await teamRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  const team = snap.data() as Record<string, unknown>;
  const owner = String(team.ownerUid ?? team.ownerUserId ?? "");
  if (owner !== uid) {
    throw new HttpsError("permission-denied", "팀 소유자만 되돌릴 수 있습니다.");
  }

  const { generated, edited: editedRaw } = parseV2OrMigrate(team.aiProfile);
  const gen =
    generated && typeof generated === "object" && !Array.isArray(generated)
      ? (generated as Record<string, unknown>)
      : {};
  const edSim =
    editedRaw && typeof editedRaw === "object" && !Array.isArray(editedRaw)
      ? { ...(editedRaw as Record<string, unknown>) }
      : {};

  const mapKey = field === "highlights" ? "highlights" : field;
  const hasHl =
    Object.prototype.hasOwnProperty.call(edSim, "highlights") ||
    Object.prototype.hasOwnProperty.call(edSim, "homeHighlights");
  const hasDesc = Object.prototype.hasOwnProperty.call(edSim, "description");
  const hasRec = Object.prototype.hasOwnProperty.call(edSim, "recruitMessage");
  const hasCap = Object.prototype.hasOwnProperty.call(edSim, "captainMessage");

  if (field === "description" && !hasDesc) {
    return { ok: true, skipped: true as const };
  }
  if (field === "highlights" && !hasHl) {
    return { ok: true, skipped: true as const };
  }
  if (field === "recruitMessage" && !hasRec) {
    return { ok: true, skipped: true as const };
  }
  if (field === "captainMessage" && !hasCap) {
    return { ok: true, skipped: true as const };
  }

  delete edSim[mapKey];
  if (field === "highlights") {
    delete edSim.homeHighlights;
  }

  const effectiveDescription =
    Object.prototype.hasOwnProperty.call(edSim, "description") && typeof edSim.description === "string"
      ? edSim.description.trim()
      : str(gen.description);

  const updatePayload: Record<string, unknown> = {
    [`aiProfile.edited.${mapKey}`]: FieldValue.delete(),
    "aiProfile.meta.lastManualEditedAt": FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    description: effectiveDescription,
  };

  if (field === "highlights") {
    updatePayload["aiProfile.edited.homeHighlights"] = FieldValue.delete();
  }

  await teamRef.update(updatePayload);
  logger.info("[revertTeamPublicField] ok", { teamId, field });
  return { ok: true, field };
});
