/**
 * 팀 공개 에셋(대표 사진·커버) 변경 권한 — teams 문서 SoT + members/{uid} active owner/admin
 * (ownerUid / ownerUserId / ownerId / leaderId / owners[] — Storage·TeamPage와 동일 의도)
 */
import type { Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

function uidMatchesField(uid: string, v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() === uid;
  return String(v).trim() === uid;
}

export async function assertTeamPublicPhotoManager(firestore: Firestore, teamId: string, uid: string): Promise<void> {
  const teamSnap = await firestore.collection("teams").doc(teamId).get();
  if (!teamSnap.exists) {
    throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  }
  const t = teamSnap.data() as Record<string, unknown>;

  if (
    uidMatchesField(uid, t.ownerUid) ||
    uidMatchesField(uid, t.ownerUserId) ||
    uidMatchesField(uid, t.ownerId) ||
    uidMatchesField(uid, t.leaderId) ||
    uidMatchesField(uid, t.createdBy)
  ) {
    return;
  }

  const owners = t.owners;
  if (Array.isArray(owners) && owners.some((o) => uidMatchesField(uid, o))) {
    return;
  }

  const memSnap = await firestore.collection("teams").doc(teamId).collection("members").doc(uid).get();
  if (!memSnap.exists) {
    throw new HttpsError("permission-denied", "팀장 또는 운영진만 변경할 수 있어요.");
  }
  const d = memSnap.data() as Record<string, unknown> | undefined;
  const status = String(d?.status ?? "active").toLowerCase();
  if (status !== "active") {
    throw new HttpsError("permission-denied", "활성 팀원만 변경할 수 있어요.");
  }
  const role = String(d?.role ?? "").toLowerCase();
  if (role !== "owner" && role !== "admin") {
    throw new HttpsError("permission-denied", "팀장 또는 운영진만 변경할 수 있어요.");
  }
}
