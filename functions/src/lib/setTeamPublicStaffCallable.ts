/**
 * 공개 운영진(브랜딩) 목록 — `teams.aiProfile.meta.publicStaff` 저장 (구 `teamPublicStaff`는 저장 시 제거)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { AI_PROFILE_SCHEMA_VERSION, parseV2OrMigrate } from "./teamAiProfileV2";
import { omitUndefinedDeep } from "./updateTeamPublicCopyCallable";
import { assertTeamPublicPhotoManager } from "./assertTeamPublicPhotoManager";

const REGION = "asia-northeast3";
const MAX_STAFF = 12;
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function isAllowedStaffPhotoUrl(url: string, teamId: string, staffId: string): boolean {
  const u = url.trim();
  if (!u.startsWith("https://")) return false;
  const enc = encodeURIComponent(`teamPublicStaffPhotos/${teamId}/${staffId}`);
  return (
    u.includes(`teamPublicStaffPhotos%2F${teamId}%2F${staffId}`) ||
    u.includes(enc) ||
    u.includes(`teamPublicStaffPhotos/${teamId}/${staffId}`)
  );
}

function normalizeStaffInput(raw: unknown, teamId: string): Record<string, unknown>[] {
  if (!Array.isArray(raw)) {
    throw new HttpsError("invalid-argument", "staff 배열이 필요합니다.");
  }
  if (raw.length > MAX_STAFF) {
    throw new HttpsError("invalid-argument", `공개 운영진은 최대 ${MAX_STAFF}명까지 등록할 수 있어요.`);
  }
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpsError("invalid-argument", "staff 항목 형식이 올바르지 않습니다.");
    }
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!ID_RE.test(id)) {
      throw new HttpsError("invalid-argument", "각 항목 id는 영문·숫자·_- 만 1~64자여야 합니다.");
    }
    if (out.some((x) => (x.id as string) === id)) {
      throw new HttpsError("invalid-argument", "staff id가 중복되었습니다.");
    }
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    if (!name || name.length > 40) {
      throw new HttpsError("invalid-argument", "이름은 1~40자여야 합니다.");
    }
    if (!title || title.length > 40) {
      throw new HttpsError("invalid-argument", "직책(표기)은 1~40자여야 합니다.");
    }
    const intro = typeof o.intro === "string" ? o.intro.trim().slice(0, 200) : "";
    const photoRaw = typeof o.photoUrl === "string" ? o.photoUrl.trim() : "";
    if (photoRaw) {
      if (photoRaw.length > 2048) {
        throw new HttpsError("invalid-argument", "사진 주소가 너무 깁니다.");
      }
      if (!isAllowedStaffPhotoUrl(photoRaw, teamId, id)) {
        throw new HttpsError("invalid-argument", "사진은 팀 운영진 전용 저장소에 올린 링크만 사용할 수 있어요.");
      }
    }
    const visible = o.visible !== false;
    const order =
      typeof o.order === "number" && Number.isFinite(o.order)
        ? Math.max(0, Math.min(1000, Math.floor(o.order)))
        : i * 10;

    const row: Record<string, unknown> = {
      id,
      name,
      title,
      visible,
      order,
    };
    if (intro) row.intro = intro;
    if (photoRaw) row.photoUrl = photoRaw;
    out.push(row);
  }
  out.sort((a, b) => (a.order as number) - (b.order as number));
  return out;
}

export const setTeamPublicStaff = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");

  const firestore = getFirestore();
  await assertTeamPublicPhotoManager(firestore, teamId, uid);

  const staffArr = normalizeStaffInput(d.staff, teamId);

  const teamRef = firestore.collection("teams").doc(teamId);
  const snap = await teamRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  const team = snap.data() as Record<string, unknown>;

  const { generated, edited, meta: prevMeta } = parseV2OrMigrate(team.aiProfile);
  const nextMeta: Record<string, unknown> = { ...prevMeta, publicStaff: staffArr };
  if ("teamPublicStaff" in nextMeta) {
    delete nextMeta.teamPublicStaff;
  }

  const aiProfileRaw: Record<string, unknown> = {
    schemaVersion: AI_PROFILE_SCHEMA_VERSION,
    generated: omitUndefinedDeep({ ...generated }) as Record<string, unknown>,
    edited: omitUndefinedDeep({ ...edited }) as Record<string, unknown>,
    meta: omitUndefinedDeep(nextMeta) as Record<string, unknown>,
  };

  const aiProfile = omitUndefinedDeep(aiProfileRaw) as Record<string, unknown>;

  try {
    await teamRef.update({
      aiProfile,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[setTeamPublicStaff] firestore update failed", { teamId, uid, msg });
    throw new HttpsError(
      "failed-precondition",
      "운영진 저장 중 서버 오류가 났어요. 잠시 후 다시 시도해 주세요."
    );
  }

  logger.info("[setTeamPublicStaff] ok", { teamId, uid, count: staffArr.length });
  return { ok: true as const, count: staffArr.length };
});
