/**
 * 팀 공개 카피(소개·추천·CTA) 수동 수정 — teams 문서는 클라이언트 write 불가 → Callable
 * v2: edited 만 갱신, generated 유지
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  GeoPoint,
  DocumentReference,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { AI_PROFILE_SCHEMA_VERSION, parseV2OrMigrate } from "./teamAiProfileV2";

const REGION = "asia-northeast3";

/** Firestore update는 중첩 객체에 `undefined`가 있으면 실패 → 클라이언트에 internal 로 보임 */
export function omitUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value === "number" && !Number.isFinite(value)) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (value instanceof FieldValue) return value;
  if (value instanceof Timestamp) return value;
  if (value instanceof GeoPoint) return value;
  if (value instanceof DocumentReference) return value;
  if (value instanceof Date) return value;
  const ctor = (value as { constructor?: { name?: string } }).constructor?.name;
  if (ctor === "Timestamp" || ctor === "Date") return value;

  if (Array.isArray(value)) {
    return (value as unknown[])
      .map((x) => omitUndefinedDeep(x))
      .filter((x) => x !== undefined);
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    const next = omitUndefinedDeep(v);
    if (next !== undefined) out[k] = next;
  }
  return out;
}

export const updateTeamPublicCopy = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");

  const description = typeof d.description === "string" ? d.description.trim() : "";
  const recruitMessage = typeof d.recruitMessage === "string" ? d.recruitMessage.trim() : "";
  const rawHl = d.homeHighlights;
  const highlights = Array.isArray(rawHl)
    ? rawHl
        .map((x) => String(x).trim().replace(/^[-•*]\s*/, ""))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  if (!description && highlights.length === 0 && !recruitMessage) {
    throw new HttpsError("invalid-argument", "최소 한 항목 이상 입력해 주세요.");
  }
  if (description.length > 8000) {
    throw new HttpsError("invalid-argument", "팀 소개는 8,000자 이내로 입력해 주세요.");
  }
  if (recruitMessage.length > 600) {
    throw new HttpsError("invalid-argument", "참여 문구는 600자 이내로 입력해 주세요.");
  }
  for (const line of highlights) {
    if (line.length > 200) {
      throw new HttpsError("invalid-argument", "추천 항목은 각 200자 이내로 입력해 주세요.");
    }
  }

  const firestore = getFirestore();
  const teamRef = firestore.collection("teams").doc(teamId);
  const snap = await teamRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  const team = snap.data() as Record<string, unknown>;
  const owner = String(team.ownerUid ?? team.ownerUserId ?? "");
  if (owner !== uid) {
    throw new HttpsError("permission-denied", "팀 소유자만 공개 문구를 수정할 수 있습니다.");
  }

  const { generated, edited: prevEdited, meta: prevMeta } = parseV2OrMigrate(team.aiProfile);

  const nextEdited: Record<string, unknown> = {
    ...prevEdited,
    description,
    highlights,
    recruitMessage,
  };

  const metaMerged: Record<string, unknown> = {
    ...prevMeta,
    lastManualEditedAt: FieldValue.serverTimestamp(),
  };

  const aiProfileRaw: Record<string, unknown> = {
    schemaVersion: AI_PROFILE_SCHEMA_VERSION,
    generated: omitUndefinedDeep({ ...generated }) as Record<string, unknown>,
    edited: omitUndefinedDeep(nextEdited) as Record<string, unknown>,
    meta: omitUndefinedDeep(metaMerged) as Record<string, unknown>,
  };

  const aiProfile = omitUndefinedDeep(aiProfileRaw) as Record<string, unknown>;

  await teamRef.update({
    aiProfile,
    description,
    updatedAt: FieldValue.serverTimestamp(),
  });
  logger.info("[updateTeamPublicCopy] ok", { teamId });
  return { ok: true };
});
