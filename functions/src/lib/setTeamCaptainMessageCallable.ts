/**
 * 팀장·대표 공개 인사말(captainMessage) 수동 저장 — `teams.aiProfile.edited.captainMessage`
 * 권한: 팀 소유자 또는 활성 owner/admin 멤버 (`assertTeamPublicPhotoManager`와 동일)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { AI_PROFILE_SCHEMA_VERSION, parseV2OrMigrate } from "./teamAiProfileV2";
import { omitUndefinedDeep } from "./updateTeamPublicCopyCallable";
import { assertTeamPublicPhotoManager } from "./assertTeamPublicPhotoManager";

const REGION = "asia-northeast3";
const MAX_LEN = 1200;

export const setTeamCaptainMessage = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");

  const raw = typeof d.captainMessage === "string" ? d.captainMessage : "";
  const captainMessage = raw.trim();
  if (captainMessage.length > MAX_LEN) {
    throw new HttpsError("invalid-argument", `인사말은 ${MAX_LEN}자 이내로 입력해 주세요.`);
  }

  const firestore = getFirestore();
  await assertTeamPublicPhotoManager(firestore, teamId, uid);

  const teamRef = firestore.collection("teams").doc(teamId);
  const snap = await teamRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  const team = snap.data() as Record<string, unknown>;

  const { generated, edited: prevEdited, meta: prevMeta } = parseV2OrMigrate(team.aiProfile);
  const nextEdited: Record<string, unknown> =
    prevEdited && typeof prevEdited === "object" && !Array.isArray(prevEdited)
      ? { ...(prevEdited as Record<string, unknown>) }
      : {};

  if (captainMessage.length === 0) {
    delete nextEdited.captainMessage;
  } else {
    nextEdited.captainMessage = captainMessage;
  }

  /** spread·레거시 edited/meta에 섞인 `undefined`는 Firestore가 거부 → 서브트리마다 정리 후 전체 한 번 더 */
  const metaMerged: Record<string, unknown> = {
    ...(prevMeta && typeof prevMeta === "object" && !Array.isArray(prevMeta) ? prevMeta : {}),
    lastCaptainMessageEditedAt: Timestamp.now(),
  };

  const aiProfileRaw: Record<string, unknown> = {
    schemaVersion: AI_PROFILE_SCHEMA_VERSION,
    generated: omitUndefinedDeep({ ...generated }) as Record<string, unknown>,
    edited: omitUndefinedDeep(nextEdited) as Record<string, unknown>,
    meta: omitUndefinedDeep(metaMerged) as Record<string, unknown>,
  };

  const aiProfile = omitUndefinedDeep(aiProfileRaw) as Record<string, unknown>;

  try {
    await teamRef.update({
      aiProfile,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[setTeamCaptainMessage] firestore update failed", { teamId, uid, msg });
    throw new HttpsError(
      "failed-precondition",
      "인사말 저장 중 서버 오류가 났어요. 잠시 후 다시 시도해 주세요."
    );
  }

  logger.info("[setTeamCaptainMessage] ok", { teamId, uid, len: captainMessage.length });
  return { ok: true as const };
});
