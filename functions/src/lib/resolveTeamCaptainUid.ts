/**
 * 팀 문서의 ownerUid / owners / members(role·accessLevel) 순으로 팀장(오너) UID 결정.
 * inactive 알림·빌링 알림 등 서버 스케줄러에서 공통 사용.
 */
import * as admin from "firebase-admin";

const db = admin.firestore();

export async function resolveTeamCaptainUid(
  teamId: string,
  teamData: Record<string, unknown>
): Promise<string | null> {
  const owner =
    (typeof teamData.ownerUid === "string" && teamData.ownerUid.trim()) ||
    (Array.isArray(teamData.owners) && typeof teamData.owners[0] === "string"
      ? String(teamData.owners[0]).trim()
      : "");
  if (owner) return owner;

  const snap = await db.collection(`teams/${teamId}/members`).limit(80).get();
  for (const doc of snap.docs) {
    const m = doc.data() as Record<string, unknown>;
    const role = String(m.role || "").toLowerCase();
    const access = String(m.accessLevel || "");
    if (role === "owner" || access === "OWNER") return doc.id;
  }
  for (const doc of snap.docs) {
    const m = doc.data() as Record<string, unknown>;
    const role = String(m.role || "").toLowerCase();
    const access = String(m.accessLevel || "");
    if (role === "admin" || access === "ADMIN") return doc.id;
  }
  return null;
}
