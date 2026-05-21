/**
 * 보안 초대 토큰: `teamMemberInvites/{inviteId}` + `/invite/:inviteId` OTP 수락
 */
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { ensureFirebaseAdminApp } from "../lib/ensureFirebaseAdminApp";

import {
  assertCanInviteMembers,
  linkInvitedMembersForUidPhone,
  normalizePhoneE164,
  sendTwilioInviteSms,
} from "./phoneInviteTeamMembers";
import {
  TEAM_MEMBER_INVITES_COLLECTION,
  buildMemberInviteSmsBody,
  insertPendingTeamMemberInvite,
  inviteAppOrigin,
} from "./inviteDocWriter";
import { grantAvatarXp } from "../lib/avatar/grantAvatarXp";

ensureFirebaseAdminApp();
const db = getFirestore();

function authPhoneNormFromCallable(authToken: Record<string, unknown> | undefined): string {
  const tokenPhone =
    typeof authToken?.phone_number === "string" ? String(authToken.phone_number) : "";
  let phoneE164 = normalizePhoneE164(tokenPhone);
  if (!phoneE164.startsWith("+")) {
    return "";
  }
  return phoneE164;
}

/**
 * 초대 카드 노출 전용 — 전화번호·개인 필드 노출 금지. 비로그인 호출 허용.
 */
export const previewTeamMemberInvite = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 20,
    invoker: "public",
  },
  async (request): Promise<{
    found: boolean;
    teamId?: string;
    teamName?: string;
    reason?: string;
    expiresAtMs?: number;
  }> => {
    const inviteId = String(request.data?.inviteId ?? "").trim();
    if (!inviteId) {
      return { found: false, reason: "INVALID_ID" };
    }

    const ref = db.doc(`${TEAM_MEMBER_INVITES_COLLECTION}/${inviteId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return { found: false, reason: "NOT_FOUND" };
    }

    const d = snap.data() as Record<string, unknown>;
    const status = String(d.status ?? "").toLowerCase();
    const exp = d.expiresAt as Timestamp | undefined;
    const expMs = exp?.toMillis?.() ?? 0;

    if (status === "accepted") {
      return { found: false, reason: "ALREADY_ACCEPTED" };
    }
    if (status === "expired" || status !== "pending") {
      return { found: false, reason: status === "expired" ? "EXPIRED" : "INVALID_STATUS" };
    }
    if (expMs > 0 && expMs < Date.now()) {
      await ref.update({
        status: "expired",
        expiredAt: FieldValue.serverTimestamp(),
      }).catch(() => undefined);
      return { found: false, reason: "EXPIRED" };
    }

    const teamId = String(d.teamId ?? "").trim();
    if (!teamId) {
      return { found: false, reason: "INVALID_INVITE_DATA" };
    }

    let teamName = "팀";
    const teamSnap = await db.doc(`teams/${teamId}`).get();
    if (teamSnap.exists) {
      const tn = String((teamSnap.data() as Record<string, unknown>)?.name ?? "").trim();
      if (tn) teamName = tn;
    }

    return { found: true, teamId, teamName, expiresAtMs: expMs || undefined };
  }
);

/** 팀 스태프: 기존 멤버에게 초대 토큰만 재발급(SMS 옵션) */
export const createTeamMemberInvite = onCall(
  { region: "asia-northeast3", cors: true, maxInstances: 15 },
  async (
    request
  ): Promise<{ inviteId: string; inviteUrl: string; smsSent: boolean }> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }
    const actorUid = request.auth.uid;
    const teamId = String(request.data?.teamId ?? "").trim();
    const memberId = String(request.data?.memberId ?? "").trim();
    const sendSms = request.data?.sendSms !== false;

    if (!teamId || !memberId) {
      throw new HttpsError("invalid-argument", "teamId, memberId가 필요합니다.");
    }

    await assertCanInviteMembers(actorUid, teamId);

    const mref = db.doc(`teams/${teamId}/members/${memberId}`);
    const ms = await mref.get();
    if (!ms.exists) {
      throw new HttpsError("not-found", "MEMBER_NOT_FOUND");
    }
    const m = ms.data() as Record<string, unknown>;
    const status = String(m.status ?? "").toLowerCase();
    const uidLinked = typeof m.userId === "string" && m.userId.trim();
    if (uidLinked) {
      throw new HttpsError("failed-precondition", "ALREADY_LINKED");
    }
    if (status === "expelled") {
      throw new HttpsError("failed-precondition", "MEMBER_REMOVED");
    }

    const phoneE164 = normalizePhoneE164(String(m.phone ?? ""));
    if (!phoneE164.startsWith("+")) {
      throw new HttpsError("failed-precondition", "MEMBER_PHONE_REQUIRED");
    }

    const inviteId = await insertPendingTeamMemberInvite({
      teamId,
      memberId,
      phoneE164,
      createdByUid: actorUid,
    });

    const origin = inviteAppOrigin();
    const inviteUrl = `${origin}/invite/${encodeURIComponent(inviteId)}`;

    let smsSent = false;
    if (sendSms) {
      const teamSnap = await db.doc(`teams/${teamId}`).get();
      const teamName = teamSnap.exists
        ? String((teamSnap.data() as Record<string, unknown>).name ?? "").trim() || "팀"
        : "팀";
      smsSent = await sendTwilioInviteSms(phoneE164, buildMemberInviteSmsBody(inviteId, teamName)).catch(
        () => false
      );
    }

    logger.info("[createTeamMemberInvite] ok", { teamId, memberId, inviteId, smsSent });
    return { inviteId, inviteUrl, smsSent };
  }
);

export const claimTeamMemberInvite = onCall(
  { region: "asia-northeast3", cors: true, maxInstances: 30 },
  async (
    request
  ): Promise<{ linked: number; skipped: number; alreadyAccepted?: boolean }> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }
    const uid = request.auth.uid;
    const inviteId = String(request.data?.inviteId ?? "").trim();
    if (!inviteId) {
      throw new HttpsError("invalid-argument", "inviteId가 필요합니다.");
    }

    let phoneE164 = authPhoneNormFromCallable(
      request.auth.token as Record<string, unknown> | undefined
    );
    if (!phoneE164.startsWith("+")) {
      const user = await getAuth().getUser(uid);
      phoneE164 = normalizePhoneE164(user.phoneNumber ?? "");
    }
    if (!phoneE164.startsWith("+")) {
      throw new HttpsError("failed-precondition", "PHONE_AUTH_REQUIRED");
    }

    const invRef = db.doc(`${TEAM_MEMBER_INVITES_COLLECTION}/${inviteId}`);
    const invSnap = await invRef.get();
    if (!invSnap.exists) {
      throw new HttpsError("not-found", "INVITE_NOT_FOUND");
    }

    const inv = invSnap.data() as Record<string, unknown>;
    const teamId = String(inv.teamId ?? "").trim();
    const memberId = String(inv.memberId ?? "").trim();
    const invPhone = normalizePhoneE164(String(inv.phone ?? ""));
    const status = String(inv.status ?? "").toLowerCase();
    const exp = inv.expiresAt as Timestamp | undefined;
    const expMs = exp?.toMillis?.() ?? 0;

    if (!teamId || !memberId || !invPhone.startsWith("+")) {
      throw new HttpsError("failed-precondition", "INVALID_INVITE_DATA");
    }

    if (status === "accepted") {
      const by = String(inv.acceptedByUid ?? "").trim();
      if (by && by === uid) {
        return { linked: 0, skipped: 0, alreadyAccepted: true };
      }
      throw new HttpsError("failed-precondition", "INVITE_ALREADY_USED");
    }

    if (status !== "pending") {
      throw new HttpsError("failed-precondition", "INVITE_NOT_PENDING");
    }

    if (expMs > 0 && expMs < Date.now()) {
      await invRef.update({
        status: "expired",
        expiredAt: FieldValue.serverTimestamp(),
      }).catch(() => undefined);
      throw new HttpsError("failed-precondition", "INVITE_EXPIRED");
    }

    if (invPhone !== phoneE164) {
      throw new HttpsError("permission-denied", "PHONE_MISMATCH");
    }

    const mref = db.doc(`teams/${teamId}/members/${memberId}`);
    const mSnap = await mref.get();
    if (!mSnap.exists) {
      throw new HttpsError("not-found", "MEMBER_NOT_FOUND");
    }
    const md = mSnap.data() as Record<string, unknown>;
    const memPhone = normalizePhoneE164(String(md.phone ?? ""));
    if (memPhone !== invPhone) {
      throw new HttpsError("failed-precondition", "MEMBER_PHONE_MISMATCH");
    }
    const existingUid = typeof md.userId === "string" ? md.userId.trim() : "";
    if (existingUid && existingUid !== uid) {
      throw new HttpsError("failed-precondition", "MEMBER_ALREADY_LINKED_OTHER");
    }

    const linkRes = await linkInvitedMembersForUidPhone(uid, phoneE164, { teamId });

    await invRef.set(
      {
        status: "accepted",
        acceptedAt: FieldValue.serverTimestamp(),
        acceptedByUid: uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    void grantAvatarXp(db, {
      uid,
      source: "team_invite_success",
      idempotencyKey: `team_invite_success_${inviteId}_${uid}`,
      context: { teamId, inviteId, trigger: "claim_team_member_invite" },
    }).catch((e) =>
      logger.warn("[claimTeamMemberInvite] avatar xp grant failed", { inviteId, uid, err: String(e) })
    );

    logger.info("[claimTeamMemberInvite] ok", { inviteId, teamId, uid, linkRes });
    return { linked: linkRes.linked, skipped: linkRes.skipped };
  }
);
