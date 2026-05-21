/**
 * 팀 히어로 커버 — 클라이언트 Storage 쓰기 없이 Callable + Admin SDK 업로드
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getDownloadURL } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { assertTeamPublicPhotoManager } from "./assertTeamPublicPhotoManager";
import { getDefaultStorageBucket } from "./defaultStorageBucket";
import { applyTeamCoverPhotoMetaToTeam } from "./setTeamCoverPhotoMetaCallable";

const REGION = "asia-northeast3";
const MAX_BYTES = 8 * 1024 * 1024;
const FILE_KEY = "cover";

function storagePath(teamId: string): string {
  return `teamCoverPhotos/${teamId}/${FILE_KEY}`;
}

function parseImagePayload(raw: string): { buffer: Buffer; contentType: string } {
  const s = raw.trim();
  const m = /^data:([^;]+);base64,(.*)$/is.exec(s);
  if (m) {
    const contentType = m[1].trim().toLowerCase();
    const b64 = m[2].replace(/\s/g, "");
    return { buffer: Buffer.from(b64, "base64"), contentType };
  }
  return { buffer: Buffer.from(s.replace(/\s/g, ""), "base64"), contentType: "image/jpeg" };
}

function assertImageContentType(ct: string): string {
  const base = ct.toLowerCase().split(";")[0].trim();
  if (!base.startsWith("image/")) {
    throw new HttpsError("invalid-argument", "이미지 형식만 올릴 수 있어요.");
  }
  const allowed = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
  if (!allowed.has(base)) {
    throw new HttpsError("invalid-argument", "지원 형식: JPEG, PNG, WebP, GIF");
  }
  return base === "image/jpg" ? "image/jpeg" : base;
}

export const uploadTeamCoverPhoto = onCall(
  {
    region: REGION,
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: "512MiB",
    cors: true,
  },
  async (request) => {
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

    const clear = d.clear === true;
    const bucket = getDefaultStorageBucket();
    const path = storagePath(teamId);
    const file = bucket.file(path);

    if (clear) {
      try {
        await file.delete({ ignoreNotFound: true });
      } catch (e) {
        logger.warn("[uploadTeamCoverPhoto] storage delete", { teamId, err: String(e) });
      }
      await applyTeamCoverPhotoMetaToTeam(firestore, teamId, { clear: true });
      logger.info("[uploadTeamCoverPhoto] cleared", { teamId, uid });
      return { ok: true as const, cleared: true as const };
    }

    const imagePayload =
      typeof d.imageDataUrl === "string"
        ? d.imageDataUrl
        : typeof d.imageBase64 === "string"
          ? d.imageBase64
          : "";
    if (!imagePayload.trim()) {
      throw new HttpsError("invalid-argument", "imageDataUrl 또는 imageBase64가 필요합니다.");
    }

    let buffer: Buffer;
    let contentTypeGuess: string;
    try {
      const parsed = parseImagePayload(imagePayload);
      buffer = parsed.buffer;
      contentTypeGuess = parsed.contentType;
    } catch {
      throw new HttpsError("invalid-argument", "이미지 데이터를 해석할 수 없어요.");
    }

    if (buffer.length === 0) throw new HttpsError("invalid-argument", "빈 이미지예요.");
    if (buffer.length > MAX_BYTES) {
      throw new HttpsError("invalid-argument", "파일은 8MB 이하여야 해요.");
    }

    const explicitCt = typeof d.contentType === "string" ? d.contentType.trim() : "";
    const contentType = assertImageContentType(explicitCt || contentTypeGuess);

    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: "public, max-age=3600",
      },
    });

    const downloadUrl = await getDownloadURL(file);
    await applyTeamCoverPhotoMetaToTeam(firestore, teamId, { clear: false, coverPhotoUrl: downloadUrl });

    logger.info("[uploadTeamCoverPhoto] ok", { teamId, uid, bytes: buffer.length });
    return { ok: true as const, coverPhotoUrl: downloadUrl };
  }
);
