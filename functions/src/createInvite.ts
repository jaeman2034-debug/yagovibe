/**
 * 🔐 QR 초대 토큰 생성 Cloud Function (v1 LOCK)
 * 
 * 원칙:
 * - QR에는 inviteId만 포함 (팀 정보 직접 노출 금지)
 * - coach/staff 이상만 생성 가능
 * - 기본 정책: expiresAt=24h, maxUses=1, role=member
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { writeInviteAuditLog } from "./inviteAuditLog";
import { extractRequestInfo, writeAuditLog } from "./utils/auditLog";
import { logInviteCreated } from "./utils/inviteFunnelLog";

const db = getFirestore();

type Role = "member" | "coach" | "staff";

interface CreateInviteRequest {
  teamId: string;
  role?: Role; // 기본값: "member"
  maxUses?: number; // 기본값: 1
  expiresInMs?: number; // 기본값: 24시간
  allowedDomains?: string[]; // 🔥 H단계: 이메일 도메인 제한 (엔터프라이즈)
}

interface CreateInviteResponse {
  ok: boolean;
  inviteId: string;
  teamId: string;
  role: Role;
  expiresAt: number; // milliseconds
}

export const createInvite = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<CreateInviteResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    const uid = auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const teamId = String(data.teamId || "").trim();
    if (!teamId) {
      throw new HttpsError("invalid-argument", "TEAM_ID_REQUIRED");
    }

    const role: Role = (data.role ?? "member") as Role;
    const maxUses = Number.isFinite(data.maxUses) ? Number(data.maxUses) : 1;

    // 2️⃣ 팀에서 생성자 권한 확인 (coach/staff만)
    const memberRef = db.collection("teams").doc(teamId).collection("members").doc(uid);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      throw new HttpsError("permission-denied", "NOT_TEAM_MEMBER");
    }

    const memberRole = (memberSnap.data()?.role ?? "member") as Role;

    if (!(memberRole === "coach" || memberRole === "staff")) {
      throw new HttpsError("permission-denied", "INVITE_CREATE_FORBIDDEN");
    }

    // 🔥 G-1: 좌석 사전 체크 (LOCK)
    const teamRef = db.collection("teams").doc(teamId);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "TEAM_NOT_FOUND");
    }

    const team = teamSnap.data()!;
    const { seatLimit, seatUsed } = team;
    const plan = team.plan || "free";

    if (seatUsed >= seatLimit) {
      logger.warn("⚠️ [createInvite] 좌석 제한 초과", {
        teamId,
        seatUsed,
        seatLimit,
      });
      throw new HttpsError("failed-precondition", "SEAT_LIMIT_REACHED");
    }

    // 🔥 E-1: 초대 생성 Rate Limit (1분 10회)
    const nowMs = Date.now();
    const windowMs = 60 * 1000; // 1분
    const limit = 10;

    const recentInvitesSnap = await db
      .collection("invites")
      .where("createdByUid", "==", uid)
      .where("createdAt", ">", admin.firestore.Timestamp.fromMillis(nowMs - windowMs))
      .get();

    if (recentInvitesSnap.size >= limit) {
      logger.warn("⚠️ [createInvite] Rate limit 초과", { uid, count: recentInvitesSnap.size });
      throw new HttpsError("resource-exhausted", "INVITE_RATE_LIMIT");
    }

    // 🔥 H-1: 도메인 옵션 LOCK (enterprise 플랜일 때만)
    let allowedDomains: string[] | undefined = undefined;

    if (plan === "enterprise") {
      const input = Array.isArray(data.allowedDomains)
        ? data.allowedDomains.map((d: string) => d.toLowerCase().trim()).filter((d: string) => d.length > 0)
        : [];

      if (input.length === 0) {
        logger.warn("⚠️ [createInvite] 엔터프라이즈 팀은 도메인 제한 필수", { teamId, plan });
        throw new HttpsError("invalid-argument", "ALLOWED_DOMAIN_REQUIRED");
      }

      allowedDomains = input;
    }

    // 3️⃣ 만료시간 기본 24시간
    const now = admin.firestore.Timestamp.now();
    const expiresMs = Number.isFinite(data.expiresInMs) ? Number(data.expiresInMs) : 24 * 60 * 60 * 1000;
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + expiresMs);

    // 4️⃣ inviteId 자동 생성 및 저장
    const inviteRef = db.collection("invites").doc(); // 자동 ID
    const invite = {
      teamId,
      role,
      createdByUid: uid,
      expiresAt,
      maxUses: Math.max(1, maxUses),
      usedCount: 0,
      revoked: false,
      allowExistingUser: true,
      allowNewSignup: true,
      allowedDomains, // 🔥 H-0: 이메일 도메인 제한
      requireVerifiedEmail: plan === "enterprise", // 🔥 H-0: 엔터프라이즈는 이메일 인증 필수
      createdAt: now,
      version: 1,
    };

    await inviteRef.set(invite);

    // 🔥 E-5: 초대 생성 로그 기록
    const requestInfo = extractRequestInfo((request as any).rawRequest || {});
    await writeInviteAuditLog({
      inviteId: inviteRef.id,
      event: "created",
      uid,
      ua: requestInfo.userAgent,
      ip: requestInfo.ip,
      timestamp: now,
      metadata: {
        teamId,
        role,
        expiresAt: expiresAt.toMillis(),
        maxUses: invite.maxUses,
      },
    });

    // 🔥 I-2: 초대 생성 이벤트 기록 (서버)
    await logInviteCreated(inviteRef.id, teamId, uid, plan);

    logger.info("✅ [createInvite] 초대 생성 완료", {
      inviteId: inviteRef.id,
      teamId,
      role,
      expiresAt: expiresAt.toMillis(),
      maxUses,
    });

    return {
      ok: true,
      inviteId: inviteRef.id,
      teamId,
      role,
      expiresAt: expiresAt.toMillis(),
    };
  }
);

