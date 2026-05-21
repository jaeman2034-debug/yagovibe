import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const REGION = "asia-northeast3";

function uidMatchesField(uid: string, v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() === uid;
  return String(v).trim() === uid;
}

function isActiveStatus(status: unknown): boolean {
  if (status === undefined || status === null || status === "") return true;
  return String(status).trim().toLowerCase() === "active";
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

/**
 * 팀 미디어 갤러리 업로드 전 members/{uid} SoT 보장.
 * - 팀 문서상 팀장이면 members/{uid} merge (owner/active)
 * - 레거시 members/* (문서 ID ≠ uid)만 있으면 uid 키로 복제
 */
export const ensureTeamMediaUploadAccess = onCall(
  { region: REGION, cors: true, maxInstances: 20 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const teamId =
      typeof request.data?.teamId === "string" ? request.data.teamId.trim() : "";
    if (!teamId) {
      throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
    }

    const db = getFirestore();
    const teamRef = db.collection("teams").doc(teamId);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }

    const teamData = (teamSnap.data() ?? {}) as Record<string, unknown>;
    const memberRef = teamRef.collection("members").doc(uid);
    const memberSnap = await memberRef.get();

    if (memberSnap.exists) {
      const d = memberSnap.data() as Record<string, unknown> | undefined;
      const role = String(d?.role ?? "").toLowerCase();
      if (isActiveStatus(d?.status) || role === "owner" || role === "admin") {
        if (!isActiveStatus(d?.status)) {
          await memberRef.set({ status: "active", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
        return { ok: true as const, ensured: false as const, teamId };
      }
    }

    if (isOwnerByTeamDoc(teamData, uid)) {
      const token = request.auth?.token as Record<string, unknown> | undefined;
      const displayName =
        typeof token?.name === "string" && token.name.trim()
          ? token.name.trim().slice(0, 200)
          : undefined;

      const payload: Record<string, unknown> = {
        uid,
        userId: uid,
        role: "owner",
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
        backfilledAt: FieldValue.serverTimestamp(),
        backfillSource: "ensureTeamMediaUploadAccess",
      };
      if (!memberSnap.exists) {
        payload.joinedAt = FieldValue.serverTimestamp();
      }
      if (displayName) {
        payload.displayName = displayName;
        payload.userName = displayName;
        payload.name = displayName;
      }

      await memberRef.set(payload, { merge: true });

      await db
        .collection("users")
        .doc(uid)
        .collection("teamMemberships")
        .doc(teamId)
        .set(
          {
            teamId,
            role: "owner",
            status: "active",
            teamName: String(teamData.name ?? ""),
            updatedAt: FieldValue.serverTimestamp(),
            backfillSource: "ensureTeamMediaUploadAccess",
          },
          { merge: true }
        );

      logger.info("[ensureTeamMediaUploadAccess] owner membership ensured", { uid, teamId });
      return { ok: true as const, ensured: true as const, teamId };
    }

    const [byUserId, byUid] = await Promise.all([
      teamRef.collection("members").where("userId", "==", uid).limit(1).get(),
      teamRef.collection("members").where("uid", "==", uid).limit(1).get(),
    ]);
    const legacyDoc = byUserId.docs[0] ?? byUid.docs[0];
    if (legacyDoc?.exists && isActiveStatus(legacyDoc.data()?.status)) {
      const d = legacyDoc.data() as Record<string, unknown>;
      await memberRef.set(
        {
          uid,
          userId: uid,
          role: String(d.role ?? "member").toLowerCase() || "member",
          status: "active",
          updatedAt: FieldValue.serverTimestamp(),
          backfilledAt: FieldValue.serverTimestamp(),
          backfillSource: "ensureTeamMediaUploadAccess_legacyDoc",
        },
        { merge: true }
      );
      logger.info("[ensureTeamMediaUploadAccess] legacy member copied to members/{uid}", {
        uid,
        teamId,
        legacyId: legacyDoc.id,
      });
      return { ok: true as const, ensured: true as const, teamId };
    }

    throw new HttpsError(
      "permission-denied",
      "팀 미디어 업로드 권한이 없습니다. 팀원으로 가입했는지 확인해 주세요."
    );
  }
);
