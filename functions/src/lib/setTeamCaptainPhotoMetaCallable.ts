/**
 * 운영진 대표 사진 URL — teams.aiProfile.meta.captainPhotoUrl
 * - 레거시: 클라 Storage 업로드 후 URL만 전달(setTeamCaptainPhotoMeta)
 * - 권장: uploadTeamCaptainPhoto Callable + Admin Storage 업로드 후 applyTeamCaptainPhotoMetaToTeam
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { AI_PROFILE_SCHEMA_VERSION, parseV2OrMigrate } from "./teamAiProfileV2";
import { omitUndefinedDeep } from "./updateTeamPublicCopyCallable";
import { assertTeamPublicPhotoManager } from "./assertTeamPublicPhotoManager";

const REGION = "asia-northeast3";

/** 업로드 경로와 일치하는 Storage download URL만 허용 (임의 URL 저장 방지) */
export function isAllowedCaptainPhotoUrl(url: string, teamId: string): boolean {
  const u = url.trim();
  if (!u.startsWith("https://")) return false;
  const enc = encodeURIComponent(`teamCaptainPhotos/${teamId}/`);
  return u.includes(`teamCaptainPhotos%2F${teamId}%2F`) || u.includes(enc) || u.includes(`teamCaptainPhotos/${teamId}/`);
}

export async function applyTeamCaptainPhotoMetaToTeam(
  firestore: Firestore,
  teamId: string,
  opts: { clear: boolean; captainPhotoUrl?: string }
): Promise<void> {
  const clear = opts.clear === true;
  const rawUrl = typeof opts.captainPhotoUrl === "string" ? opts.captainPhotoUrl.trim() : "";

  if (!clear && !rawUrl) {
    throw new HttpsError("invalid-argument", "captainPhotoUrl 또는 clear 가 필요합니다.");
  }

  const teamRef = firestore.collection("teams").doc(teamId);
  const snap = await teamRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");

  const team = snap.data() as Record<string, unknown>;
  const { generated, edited, meta: prevMeta } = parseV2OrMigrate(team.aiProfile);

  const nextMeta: Record<string, unknown> = { ...prevMeta };

  if (clear || !rawUrl) {
    delete nextMeta.captainPhotoUrl;
  } else {
    if (!isAllowedCaptainPhotoUrl(rawUrl, teamId)) {
      throw new HttpsError(
        "invalid-argument",
        "허용되지 않은 이미지 주소예요. 팀 운영진 사진 저장소에 올린 파일의 링크만 사용할 수 있어요."
      );
    }
    if (rawUrl.length > 2048) {
      throw new HttpsError("invalid-argument", "이미지 주소가 너무 깁니다.");
    }
    nextMeta.captainPhotoUrl = rawUrl;
    nextMeta.captainPhotoUpdatedAt = FieldValue.serverTimestamp();
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

export const setTeamCaptainPhotoMeta = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");

  const clear = d.clear === true;
  const rawUrl = typeof d.captainPhotoUrl === "string" ? d.captainPhotoUrl.trim() : "";

  if (!clear && !rawUrl) {
    throw new HttpsError("invalid-argument", "captainPhotoUrl 또는 clear: true 가 필요합니다.");
  }

  const firestore = getFirestore();
  await assertTeamPublicPhotoManager(firestore, teamId, uid);

  await applyTeamCaptainPhotoMetaToTeam(firestore, teamId, { clear, captainPhotoUrl: rawUrl || undefined });

  logger.info("[setTeamCaptainPhotoMeta] ok", { teamId, clear: clear || !rawUrl });
  return { ok: true };
});
