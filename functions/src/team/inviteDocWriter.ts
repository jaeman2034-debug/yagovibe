/**
 * 전화번호 멤버 초대 토큰(`teamMemberInvites`) 문서 작성 — 순환 참조 없이 다른 모듈에서 재사용
 */
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

export const TEAM_MEMBER_INVITES_COLLECTION = "teamMemberInvites";
export const MEMBER_INVITE_TTL_MS = 48 * 60 * 60 * 1000;

const DEFAULT_APP_ORIGIN = "https://yago-vibe-spt.web.app";

export function inviteAppOrigin(): string {
  const o = process.env.INVITE_APP_ORIGIN?.trim();
  return o && o.startsWith("http") ? o.replace(/\/$/, "") : DEFAULT_APP_ORIGIN;
}

export async function expirePendingTeamMemberInvites(teamId: string, memberId: string): Promise<number> {
  const db = getFirestore();
  const q = await db
    .collection(TEAM_MEMBER_INVITES_COLLECTION)
    .where("teamId", "==", teamId)
    .where("memberId", "==", memberId)
    .get();

  if (q.empty) return 0;

  let n = 0;
  const batch = db.batch();
  for (const d of q.docs) {
    const st = String((d.data() as { status?: string }).status ?? "").toLowerCase();
    if (st !== "pending") continue;
    batch.update(d.ref, {
      status: "expired",
      expiredAt: FieldValue.serverTimestamp(),
    });
    n++;
  }
  if (n > 0) await batch.commit();
  return n;
}

export type InsertTeamMemberInviteInput = {
  teamId: string;
  memberId: string;
  phoneE164: string;
  createdByUid: string;
};

/** pending 초대 문서 1건 생성(기존 pending 은 호출 전에 만료 처리 권장) */
export async function insertPendingTeamMemberInvite(input: InsertTeamMemberInviteInput): Promise<string> {
  const db = getFirestore();
  await expirePendingTeamMemberInvites(input.teamId, input.memberId);
  const ref = db.collection(TEAM_MEMBER_INVITES_COLLECTION).doc();
  const now = Date.now();
  await ref.set({
    teamId: input.teamId,
    memberId: input.memberId,
    phone: input.phoneE164,
    status: "pending",
    expiresAt: Timestamp.fromMillis(now + MEMBER_INVITE_TTL_MS),
    createdAt: FieldValue.serverTimestamp(),
    createdBy: input.createdByUid,
  });
  return ref.id;
}

export function buildMemberInviteSmsBody(inviteId: string, teamName: string): string {
  const origin = inviteAppOrigin();
  const link = `${origin}/invite/${encodeURIComponent(inviteId)}`;
  return `[야고] ${teamName} 팀 초대\n\n아래 링크를 눌러 팀에 참여하세요:\n${link}`;
}
