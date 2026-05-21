/**
 * 팀 미디어 갤러리 — Admin SDK 업로드 (Storage rules·members SoT 우회)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getDownloadURL } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { assertTeamPublicPhotoManager } from "./assertTeamPublicPhotoManager";
import { getDefaultStorageBucket } from "./defaultStorageBucket";

const REGION = "asia-northeast3";
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function uidMatchesField(uid: string, v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() === uid;
  return String(v).trim() === uid;
}

function isOwnerByTeamDoc(t: Record<string, unknown>, uid: string): boolean {
  if (
    uidMatchesField(uid, t.ownerUid) ||
    uidMatchesField(uid, t.ownerUserId) ||
    uidMatchesField(uid, t.ownerId) ||
    uidMatchesField(uid, t.leaderId) ||
    uidMatchesField(uid, t.createdBy)
  ) {
    return true;
  }
  const owners = t.owners;
  return Array.isArray(owners) && owners.some((o) => uidMatchesField(uid, o));
}

async function ensureMembersDocForMedia(
  teamId: string,
  uid: string,
  displayName?: string
): Promise<void> {
  const db = getFirestore();
  const teamRef = db.collection("teams").doc(teamId);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  }
  const teamData = (teamSnap.data() ?? {}) as Record<string, unknown>;
  const memberRef = teamRef.collection("members").doc(uid);
  const memberSnap = await memberRef.get();
  const status = memberSnap.data()?.status;
  const active =
    status === undefined || status === null || status === "" ||
    String(status).trim().toLowerCase() === "active";

  if (memberSnap.exists && active) return;

  if (isOwnerByTeamDoc(teamData, uid)) {
    const payload: Record<string, unknown> = {
      uid,
      userId: uid,
      role: "owner",
      status: "active",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!memberSnap.exists) payload.joinedAt = FieldValue.serverTimestamp();
    if (displayName) {
      payload.displayName = displayName;
      payload.userName = displayName;
      payload.name = displayName;
    }
    await memberRef.set(payload, { merge: true });
    return;
  }

  await assertTeamPublicPhotoManager(db, teamId, uid);
}

function parsePayload(raw: string): { buffer: Buffer; contentType: string } {
  const s = raw.trim();
  const m = /^data:([^;]+);base64,(.*)$/is.exec(s);
  if (m) {
    return {
      buffer: Buffer.from(m[2].replace(/\s/g, ""), "base64"),
      contentType: m[1].trim().toLowerCase(),
    };
  }
  return { buffer: Buffer.from(s.replace(/\s/g, ""), "base64"), contentType: "image/jpeg" };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 120) || "upload";
}

export const uploadTeamGalleryMedia = onCall(
  {
    region: REGION,
    maxInstances: 20,
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

    const filePayload =
      typeof d.imageDataUrl === "string"
        ? d.imageDataUrl
        : typeof d.fileDataUrl === "string"
          ? d.fileDataUrl
          : typeof d.imageBase64 === "string"
            ? d.imageBase64
            : "";
    if (!filePayload.trim()) {
      throw new HttpsError("invalid-argument", "fileDataUrl 또는 imageDataUrl이 필요합니다.");
    }

    const rawName = typeof d.fileName === "string" ? d.fileName : "upload.jpg";
    const safeName = sanitizeFileName(rawName);
    const explicitMime = typeof d.mimeType === "string" ? d.mimeType.trim() : "";
    const isVideo =
      d.mediaType === "video" ||
      explicitMime.startsWith("video/") ||
      /\.(mp4|mov|webm|m4v)$/i.test(safeName);

    const token = request.auth?.token as Record<string, unknown> | undefined;
    const displayName =
      typeof token?.name === "string" && token.name.trim()
        ? token.name.trim().slice(0, 200)
        : undefined;

    const firestore = getFirestore();
    await ensureMembersDocForMedia(teamId, uid, displayName);
    await assertTeamPublicPhotoManager(firestore, teamId, uid);

    let buffer: Buffer;
    let contentType: string;
    try {
      const parsed = parsePayload(filePayload);
      buffer = parsed.buffer;
      contentType = (explicitMime || parsed.contentType).split(";")[0].trim().toLowerCase();
    } catch {
      throw new HttpsError("invalid-argument", "파일 데이터를 해석할 수 없어요.");
    }

    if (buffer.length === 0) throw new HttpsError("invalid-argument", "빈 파일이에요.");
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (buffer.length > maxBytes) {
      throw new HttpsError("invalid-argument", `파일은 ${maxBytes / 1024 / 1024}MB 이하여야 해요.`);
    }

    if (isVideo && !contentType.startsWith("video/")) {
      contentType = "video/mp4";
    }
    if (!isVideo && !contentType.startsWith("image/")) {
      contentType = "image/jpeg";
    }

    const timestamp = Date.now();
    const folder = isVideo ? "videos" : "photos";
    const storagePath = `teams/${teamId}/${folder}/${timestamp}_${safeName}`;
    const bucket = getDefaultStorageBucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    const url = await getDownloadURL(file);

    const mediaType = isVideo ? "video" : "photo";
    const mediaRef = await firestore.collection("media").add({
      type: mediaType,
      entityType: "team",
      entityId: teamId,
      url,
      fileName: rawName,
      fileSize: buffer.length,
      mimeType: contentType,
      tags: [],
      uploadedBy: uid,
      status: mediaType === "photo" ? "ready" : "processing",
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("[uploadTeamGalleryMedia] ok", {
      teamId,
      uid,
      mediaId: mediaRef.id,
      bytes: buffer.length,
      storagePath,
    });

    return {
      ok: true as const,
      media: {
        id: mediaRef.id,
        type: mediaType,
        entityType: "team",
        entityId: teamId,
        url,
        fileName: rawName,
        fileSize: buffer.length,
        mimeType: contentType,
        tags: [] as string[],
        uploadedBy: uid,
        status: mediaType === "photo" ? "ready" : "processing",
      },
    };
  }
);
