/**
 * 전화번호 선등록(invited, userId=null) → SMS 링크 → Firebase Phone Auth(OTP) → 멤버 자동 연결(active)
 *
 * ━━━ 엔드투엔드 (중복 구현 금지: 멤버 연결은 본 모듈의 `linkInvitedMembersForUidPhone` 만 사용) ━━━
 * 1) 팀장: Callable `inviteTeamMemberByPhone` → `teams/{teamId}/members/{memberId}` 에 phone(E.164), status=invited
 * 2) Twilio SMS: `INVITE_APP_ORIGIN`/기본 origin + `/invite/{inviteId}` (`teamMemberInvites`)
 * 3) 팀원: `InviteLinkPage` 에서 초대 종류 분기 → OTP 후 `claimTeamMemberInvite` 또는 레거시 `claimPhoneInvitedTeamMemberships`
 * 4) 연결: **동일 `members/{memberId}` 문서에 `userId`·`status:active` 등 update** — 문서 ID 유지(회비·납부 키 보존)
 *    + `users/.../teamMemberships` 미러
 *
 * ━━━ 자동 연결 2경로 (둘 다 동일 함수 호출 → idempotent: 이미 동일 uid 연결 시 skip) ━━━
 * • `onAuthUserCreateLinkPhoneInvites` (Auth v1 onCreate): 앱 밖 가입·링크 없이 OTP만 한 경우 백업
 * • `claimPhoneInvitedTeamMemberships` (onCall): 링크 랜딩에서 명시적 연결
 *
 * ━━━ 팀 초대와의 구분 (기능 중복 아님) ━━━
 * • `inviteLinks` + `/invite/:inviteId` → 가입 **요청(teamJoinRequests)** 흐름 (`InviteLinkPage`)
 * • 전화 초대 보안 링크: `teamMemberInvites/{inviteId}` + `/invite/:inviteId`
 * • 레거시 `?teamId=&phone=` 쿼리는 클라 호환만 유지(신규 SMS에는 미포함)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions";
import axios from "axios";
import { ensureFirebaseAdminApp } from "../lib/ensureFirebaseAdminApp";
import { buildMemberInviteSmsBody, insertPendingTeamMemberInvite } from "./inviteDocWriter";
import { seedOpenFeesForActiveMember } from "./seedPaymentsForNewlyActiveMember";

ensureFirebaseAdminApp();
const db = getFirestore();

/** 한국 입력과 동일 규칙으로 E.164 (+82…) */
export function normalizePhoneE164(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("82")) return `+${digits}`;
  let n = digits;
  if (n.startsWith("0")) n = n.substring(1);
  return `+82${n}`;
}

function removalRolePower(roleRaw: unknown): number {
  const r = String(roleRaw ?? "member")
    .trim()
    .toLowerCase();
  if (r === "owner" || r === "admin") return 100;
  if (r === "coach" || r === "manager") return 80;
  return 10;
}

export async function assertCanInviteMembers(actorUid: string, teamId: string): Promise<void> {
  const teamSnap = await db.doc(`teams/${teamId}`).get();
  if (!teamSnap.exists) {
    throw new HttpsError("not-found", "TEAM_NOT_FOUND");
  }
  const team = teamSnap.data() as Record<string, unknown>;
  const ownerUid = String(team.ownerUid ?? team.ownerUserId ?? "").trim();
  if (ownerUid && ownerUid === actorUid) return;

  const actorSnap = await db.doc(`teams/${teamId}/members/${actorUid}`).get();
  if (!actorSnap.exists) {
    throw new HttpsError("permission-denied", "NOT_TEAM_MEMBER");
  }
  const power = removalRolePower(actorSnap.get("role"));
  if (power < 80) {
    throw new HttpsError("permission-denied", "INSUFFICIENT_ROLE");
  }
}

/** teamMemberInvites 등 다른 모듈에서 SMS 발송 재사용 */
export async function sendTwilioInviteSms(toE164: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!accountSid || !authToken) {
    logger.warn("[phoneInvite] Twilio 자격 증명 없음 — SMS 생략");
    return false;
  }
  if (!messagingServiceSid && !fromNumber) {
    logger.warn("[phoneInvite] TWILIO_MESSAGING_SERVICE_SID 또는 TWILIO_PHONE_NUMBER 필요 — SMS 생략");
    return false;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.set("To", toE164);
  params.set("Body", body);
  if (messagingServiceSid) params.set("MessagingServiceSid", messagingServiceSid);
  else params.set("From", fromNumber!);

  await axios.post(url, params.toString(), {
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });
  return true;
}

export interface LinkPhoneInvitesResult {
  linked: number;
  skipped: number;
}

/**
 * phone(E.164) + invited 상태 멤버 문서를 **문서 ID 유지한 채** userId 연결·active 승격.
 */
export async function linkInvitedMembersForUidPhone(
  uid: string,
  phoneE164: string,
  options?: { teamId?: string }
): Promise<LinkPhoneInvitesResult> {
  if (!uid || !phoneE164.startsWith("+")) {
    return { linked: 0, skipped: 0 };
  }

  const authPhoneNorm = normalizePhoneE164(phoneE164);
  if (!authPhoneNorm.startsWith("+")) {
    return { linked: 0, skipped: 0 };
  }

  const snap = await db
    .collectionGroup("members")
    .where("phone", "==", authPhoneNorm)
    .where("status", "==", "invited")
    .get();

  let linked = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const pathParts = docSnap.ref.path.split("/");
    if (pathParts.length < 4 || pathParts[0] !== "teams" || pathParts[2] !== "members") {
      continue;
    }
    const teamId = pathParts[1];
    if (options?.teamId && options.teamId !== teamId) continue;

    const data = docSnap.data() as Record<string, unknown>;
    const existingUserId = typeof data.userId === "string" ? data.userId.trim() : "";

    if (existingUserId === uid) {
      skipped += 1;
      continue;
    }
    if (existingUserId) {
      throw new HttpsError("failed-precondition", "MEMBER_ALREADY_LINKED");
    }

    const docPhoneNorm = normalizePhoneE164(String(data.phone ?? ""));
    if (docPhoneNorm !== authPhoneNorm) {
      throw new HttpsError("permission-denied", "PHONE_MISMATCH");
    }

    /** 이미 `members/{uid}` 가 다른 경로로 존재하면 초대 스텁만 제거(레거시·중복 가입) */
    const uidKeyedRef = db.doc(`teams/${teamId}/members/${uid}`);
    const uidKeyedSnap = await uidKeyedRef.get();
    if (uidKeyedSnap.exists && uidKeyedSnap.ref.path !== docSnap.ref.path) {
      await docSnap.ref.delete().catch(() => undefined);
      skipped += 1;
      continue;
    }

    const teamSnap = await db.doc(`teams/${teamId}`).get();
    const teamName = teamSnap.exists
      ? String((teamSnap.data() as Record<string, unknown>).name ?? "").trim()
      : "";

    const roleRaw = String(data.role ?? "member").toLowerCase();
    const role =
      roleRaw === "owner" || roleRaw === "admin" || roleRaw === "member" ? roleRaw : "member";

    const memberRef = docSnap.ref;
    const batch = db.batch();
    batch.update(memberRef, {
      uid,
      userId: uid,
      teamId,
      role,
      status: "active",
      phone: authPhoneNorm,
      joinedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      invitedAt: data.invitedAt ?? FieldValue.serverTimestamp(),
      isDeleted: false,
      inviteSource: FieldValue.delete(),
    });

    const mirrorRef = db.doc(`users/${uid}/teamMemberships/${teamId}`);
    batch.set(
      mirrorRef,
      {
        teamId,
        userId: uid,
        role,
        status: "active",
        teamName: teamName || null,
        joinedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
    linked += 1;

    try {
      const afterSnap = await memberRef.get();
      if (afterSnap.exists) {
        await seedOpenFeesForActiveMember(db, teamId, afterSnap.id, afterSnap.data() as Record<string, unknown>);
      }
    } catch (seedErr) {
      logger.error("[linkInvitedMembersForUidPhone] seedOpenFeesForActiveMember failed", {
        teamId,
        memberPath: memberRef.path,
        err: seedErr instanceof Error ? seedErr.message : String(seedErr),
      });
    }
  }

  return { linked, skipped };
}

export interface InviteTeamMemberByPhoneInput {
  teamId: string;
  name: string;
  phone: string;
  role?: "member" | "admin";
}

export const inviteTeamMemberByPhone = onCall(
  { region: "asia-northeast3", cors: true, maxInstances: 10 },
  async (
    request
  ): Promise<{ memberId: string; smsSent: boolean; inviteId?: string }> => {
    const { auth, data } = request;
    if (!auth?.uid) {
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }
    const body = data as InviteTeamMemberByPhoneInput;
    const teamId = String(body?.teamId ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const phoneE164 = normalizePhoneE164(String(body?.phone ?? ""));
    const role = body?.role === "admin" ? "admin" : "member";

    if (!teamId || !name || !phoneE164.startsWith("+")) {
      throw new HttpsError("invalid-argument", "INVALID_INPUT");
    }

    await assertCanInviteMembers(auth.uid, teamId);

    const dup = await db
      .collection(`teams/${teamId}/members`)
      .where("phone", "==", phoneE164)
      .limit(5)
      .get();
    const dupActive = dup.docs.find((d) => {
      const st = String((d.data() as { status?: string }).status ?? "").toLowerCase();
      return st === "invited" || st === "active";
    });
    const teamSnap = await db.doc(`teams/${teamId}`).get();
    const teamName = teamSnap.exists
      ? String((teamSnap.data() as Record<string, unknown>).name ?? "").trim()
      : "팀";

    if (dupActive) {
      const d = dupActive.data() as { userId?: string; status?: string };
      if (d.userId && String(d.userId).trim()) {
        throw new HttpsError("already-exists", "PHONE_ALREADY_MEMBER");
      }
      const inviteId = await insertPendingTeamMemberInvite({
        teamId,
        memberId: dupActive.id,
        phoneE164,
        createdByUid: auth.uid,
      });
      const smsBody = buildMemberInviteSmsBody(inviteId, teamName);
      const sent = await sendTwilioInviteSms(phoneE164, smsBody).catch((e) => {
        logger.error("[inviteTeamMemberByPhone] SMS 재발송 실패", e);
        return false;
      });
      return { memberId: dupActive.id, smsSent: Boolean(sent), inviteId };
    }

    const colRef = db.collection(`teams/${teamId}/members`);
    const docRef = colRef.doc();
    await docRef.set({
      name,
      phone: phoneE164,
      userId: null,
      role,
      status: "invited",
      invitedAt: FieldValue.serverTimestamp(),
      teamId,
      isDeleted: false,
    });

    const inviteId = await insertPendingTeamMemberInvite({
      teamId,
      memberId: docRef.id,
      phoneE164,
      createdByUid: auth.uid,
    });
    const smsBody = buildMemberInviteSmsBody(inviteId, teamName);
    const smsSent = await sendTwilioInviteSms(phoneE164, smsBody).catch((e) => {
      logger.error("[inviteTeamMemberByPhone] SMS 실패", e);
      return false;
    });

    logger.info("[inviteTeamMemberByPhone] ok", { teamId, memberId: docRef.id, smsSent });
    return { memberId: docRef.id, smsSent: Boolean(smsSent), inviteId };
  }
);

export interface ClaimPhoneInvitedTeamMembershipsInput {
  teamId?: string;
}

export const claimPhoneInvitedTeamMemberships = onCall(
  { region: "asia-northeast3", cors: true, maxInstances: 20 },
  async (request): Promise<LinkPhoneInvitesResult> => {
    const { auth, data } = request;
    if (!auth?.uid) {
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }
    const uid = auth.uid;
    const tokenPhone =
      typeof (auth.token as Record<string, unknown> | undefined)?.phone_number === "string"
        ? String((auth.token as Record<string, unknown>).phone_number)
        : "";
    let phoneE164 = normalizePhoneE164(tokenPhone);
    if (!phoneE164.startsWith("+")) {
      const user = await getAuth().getUser(uid);
      phoneE164 = normalizePhoneE164(user.phoneNumber ?? "");
    }
    if (!phoneE164.startsWith("+")) {
      throw new HttpsError("failed-precondition", "PHONE_AUTH_REQUIRED");
    }

    const teamIdOpt =
      typeof (data as ClaimPhoneInvitedTeamMembershipsInput)?.teamId === "string"
        ? String((data as ClaimPhoneInvitedTeamMembershipsInput).teamId).trim()
        : "";

    const result = await linkInvitedMembersForUidPhone(uid, phoneE164, {
      teamId: teamIdOpt || undefined,
    });
    logger.info("[claimPhoneInvitedTeamMemberships]", { uid, ...result, teamId: teamIdOpt || null });
    return result;
  }
);

export interface UpdateInvitedMemberPhoneInput {
  teamId: string;
  memberDocId: string;
  /** 한국 번호 입력 또는 E.164 */
  phone: string;
  /** 표시 이름(선택) */
  name?: string;
  /** 기본 true — 번호/이름 변경 후 초대 문자 재발송 */
  resendSms?: boolean;
  /** 계정 미연결 멤버: 배번·회비 등 팀 관리 탭 필드를 같은 트랜잭션으로 반영 (클라 2차 update 제거) */
  profile?: {
    jerseyNumber?: number | null;
    birthYear?: number | null;
    uniformSize?: string | null;
    position?: string;
    roleDetail?: string;
    duesType?: "monthly" | "yearly" | "exempt";
    yearlyPaidAtMillis?: number | null;
  };
}

const ALLOWED_UNIFORM_CF = new Set(["S", "M", "L", "XL", "2XL"]);

function applyMemberProfileToPatch(
  profile: UpdateInvitedMemberPhoneInput["profile"],
  patch: Record<string, unknown>
): void {
  if (!profile || typeof profile !== "object") return;
  const p = profile;

  if ("jerseyNumber" in p) {
    const j = p.jerseyNumber;
    if (j == null) patch.jerseyNumber = null;
    else if (typeof j === "number" && Number.isFinite(j)) {
      const v = Math.trunc(j);
      if (v >= 1 && v <= 999) patch.jerseyNumber = v;
    }
  }

  if ("birthYear" in p) {
    const b = p.birthYear;
    if (b == null) patch.birthYear = null;
    else if (typeof b === "number" && Number.isFinite(b)) {
      const y = Math.trunc(b);
      const nowY = new Date().getFullYear();
      if (y >= 1900 && y <= nowY) patch.birthYear = y;
    }
  }

  if ("uniformSize" in p) {
    const u = p.uniformSize;
    if (u == null || u === "") patch.uniformSize = null;
    else if (typeof u === "string") {
      const up = u.trim().toUpperCase();
      if (ALLOWED_UNIFORM_CF.has(up)) patch.uniformSize = up;
    }
  }

  if (typeof p.position === "string") {
    const pos = p.position.trim().toUpperCase().slice(0, 8);
    patch.position = pos;
  }
  if (typeof p.roleDetail === "string") {
    patch.roleDetail = p.roleDetail.trim().slice(0, 240);
  }

  if (p.duesType === "monthly" || p.duesType === "yearly" || p.duesType === "exempt") {
    patch.duesType = p.duesType;
    patch.feePlan = p.duesType === "yearly" ? "annual" : p.duesType;
    if (p.duesType === "monthly" || p.duesType === "exempt") {
      patch.yearlyPaidAt = null;
      patch.annualPaidAt = null;
    }
  }

  if ("yearlyPaidAtMillis" in p && p.duesType === "yearly") {
    const ms = p.yearlyPaidAtMillis;
    if (ms == null) {
      patch.yearlyPaidAt = null;
      patch.annualPaidAt = null;
    } else if (typeof ms === "number" && Number.isFinite(ms)) {
      const ts = Timestamp.fromMillis(ms);
      patch.yearlyPaidAt = ts;
      patch.annualPaidAt = ts;
    }
  }
}

export const updateInvitedMemberPhone = onCall(
  { region: "asia-northeast3", cors: true, maxInstances: 10 },
  async (request): Promise<{ ok: boolean; smsSent: boolean }> => {
    try {
      const { auth, data } = request;
      if (!auth?.uid) {
        throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
      }
      const body = data as UpdateInvitedMemberPhoneInput;
      const teamId = String(body?.teamId ?? "").trim();
      const memberDocId = String(body?.memberDocId ?? "").trim();
      const phoneE164 = normalizePhoneE164(String(body?.phone ?? ""));
      const namePatch = typeof body?.name === "string" ? body.name.trim() : "";
      const resendSms = body?.resendSms !== false;

      if (!teamId || !memberDocId || !phoneE164.startsWith("+")) {
        throw new HttpsError("invalid-argument", "INVALID_INPUT");
      }

      await assertCanInviteMembers(auth.uid, teamId);

      const ref = db.doc(`teams/${teamId}/members/${memberDocId}`);
      const snap = await ref.get();
      if (!snap.exists) {
        throw new HttpsError("not-found", "MEMBER_NOT_FOUND");
      }
      const m = snap.data() as Record<string, unknown>;
      const status = String(m.status ?? "").toLowerCase();
      const uidLinked = typeof m.userId === "string" && m.userId.trim();
      if (uidLinked) {
        throw new HttpsError("failed-precondition", "ALREADY_LINKED");
      }
      /** OTP 연결 전이면 `invited` 외 레이블(active 등)이어도 전화·표시명 수정 허용 (클라 `updateTeamMemberProfile`은 phone 미지원) */
      if (status === "expelled") {
        throw new HttpsError("failed-precondition", "MEMBER_REMOVED");
      }

      const dup = await db.collection(`teams/${teamId}/members`).where("phone", "==", phoneE164).limit(12).get();
      const clash = dup.docs.find((d) => d.id !== memberDocId);
      if (clash) {
        const other = clash.data() as { userId?: string; status?: string };
        const ost = String(other.status ?? "").toLowerCase();
        if (ost === "active" || (other.userId && String(other.userId).trim())) {
          throw new HttpsError("already-exists", "PHONE_IN_USE");
        }
      }

      const teamSnap = await db.doc(`teams/${teamId}`).get();
      const teamName = teamSnap.exists
        ? String((teamSnap.data() as Record<string, unknown>).name ?? "").trim()
        : "팀";

      const patch: Record<string, unknown> = {
        phone: phoneE164,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (namePatch) {
        patch.name = namePatch;
      }
      applyMemberProfileToPatch(body.profile, patch);

      await ref.update(patch);

      let smsSent = false;
      if (resendSms) {
        const ivId = await insertPendingTeamMemberInvite({
          teamId,
          memberId: memberDocId,
          phoneE164,
          createdByUid: auth.uid,
        });
        smsSent = await sendTwilioInviteSms(
          phoneE164,
          buildMemberInviteSmsBody(ivId, teamName)
        ).catch(() => false);
      }

      logger.info("[updateInvitedMemberPhone] ok", { teamId, memberDocId, smsSent });
      return { ok: true, smsSent: Boolean(smsSent) };
    } catch (e: unknown) {
      if (e instanceof HttpsError) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("[updateInvitedMemberPhone] unhandled", {
        message: msg.slice(0, 500),
        stack: e instanceof Error ? e.stack : undefined,
      });
      throw new HttpsError("internal", msg.length > 380 ? `${msg.slice(0, 380)}…` : msg);
    }
  }
);
