/**
 * 팀 커버 이미지 URL — teams.aiProfile.meta.coverPhotoUrl
 * - 클라이언트 Storage 직접 업로드 후 URL 전달(setTeamCoverPhotoMeta)
 * - 서버 업로드(uploadTeamCoverPhoto) 후 동일 필드 갱신(applyTeamCoverPhotoMetaToTeam)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { AI_PROFILE_SCHEMA_VERSION, parseV2OrMigrate } from "./teamAiProfileV2";
import { omitUndefinedDeep } from "./updateTeamPublicCopyCallable";
import { assertTeamPublicPhotoManager } from "./assertTeamPublicPhotoManager";

const REGION = "asia-northeast3";

function isAllowedCoverPhotoUrl(url: string, teamId: string): boolean {
  const u = url.trim();
  if (!u.startsWith("https://")) return false;
  const enc = encodeURIComponent(`teamCoverPhotos/${teamId}/`);
  return (
    u.includes(`teamCoverPhotos%2F${teamId}%2F`) ||
    u.includes(enc) ||
    u.includes(`teamCoverPhotos/${teamId}/`)
  );
}

/** Callable·서버 업로드 공통 — 팀 문서 aiProfile.meta.coverPhotoUrl 반영 */
export async function applyTeamCoverPhotoMetaToTeam(
  firestore: Firestore,
  teamId: string,
  opts: { clear: boolean; coverPhotoUrl?: string }
): Promise<void> {
  const clear = opts.clear === true;
  const rawUrl = typeof opts.coverPhotoUrl === "string" ? opts.coverPhotoUrl.trim() : "";

  if (!clear && !rawUrl) {
    throw new HttpsError("invalid-argument", "coverPhotoUrl 또는 clear 가 필요합니다.");
  }

  const teamRef = firestore.collection("teams").doc(teamId);
  const snap = await teamRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");

  const team = snap.data() as Record<string, unknown>;
  const { generated, edited, meta: prevMeta } = parseV2OrMigrate(team.aiProfile);

  const nextMeta: Record<string, unknown> = { ...prevMeta };

  if (clear || !rawUrl) {
    delete nextMeta.coverPhotoUrl;
  } else {
    if (!isAllowedCoverPhotoUrl(rawUrl, teamId)) {
      throw new HttpsError(
        "invalid-argument",
        "허용되지 않은 이미지 주소예요. 팀 커버 전용 저장소에 올린 파일의 링크만 사용할 수 있어요."
      );
    }
    if (rawUrl.length > 2048) {
      throw new HttpsError("invalid-argument", "이미지 주소가 너무 깁니다.");
    }
    nextMeta.coverPhotoUrl = rawUrl;
    nextMeta.coverPhotoUpdatedAt = FieldValue.serverTimestamp();
  }

  const aiProfileRaw: Record<string, unknown> = {
    schemaVersion: AI_PROFILE_SCHEMA_VERSION,
    generated: omitUndefinedDeep({ ...generated }) as Record<string, unknown>,
    edited: omitUndefinedDeep({ ...edited }) as Record<string, unknown>,
    meta: omitUndefinedDeep(nextMeta) as Record<string, unknown>,
  };

  const aiProfile = omitUndefinedDeep(aiProfileRaw) as Record<string, unknown>;

  await teamRef.update({
    aiProfile,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export const setTeamCoverPhotoMeta = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");

  const clear = d.clear === true;
  const rawUrl = typeof d.coverPhotoUrl === "string" ? d.coverPhotoUrl.trim() : "";

  if (!clear && !rawUrl) {
    throw new HttpsError("invalid-argument", "coverPhotoUrl 또는 clear: true 가 필요합니다.");
  }

  const firestore = getFirestore();
  await assertTeamPublicPhotoManager(firestore, teamId, uid);

  await applyTeamCoverPhotoMetaToTeam(firestore, teamId, { clear, coverPhotoUrl: rawUrl || undefined });

  logger.info("[setTeamCoverPhotoMeta] ok", { teamId, clear: clear || !rawUrl });
  return { ok: true };
});
