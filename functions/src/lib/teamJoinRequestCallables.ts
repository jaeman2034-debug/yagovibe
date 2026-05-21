/**
 * 팀 가입 요청 승인·거절 — Callable (Admin SDK)
 * 클라이언트 트랜잭션 대신 서버에서만 members / team_members / 요청 문서 갱신
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const REGION = "asia-northeast3";

/** teams/{teamId}/members SoT — 팀 관리 UI(오너·부팀장·매니저 등)와 맞춤 */
const HUB_STAFF_ROLES = new Set([
  "owner",
  "manager",
  "coach",
  "admin",
  "vice",
  "부팀장",
]);

function requireAuthUid(request: { auth?: { uid?: string } }): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  return uid;
}

function assertNonEmptyString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new HttpsError("invalid-argument", `${field}가 필요합니다.`);
  }
  return v.trim();
}

function pickDisplayAndEmailFromUserDoc(
  data: Record<string, unknown> | undefined
): { display: string; email: string } {
  if (!data) return { display: "", email: "" };
  const email =
    (typeof data.email === "string" && data.email.trim()) ||
    (typeof data.userEmail === "string" && data.userEmail.trim()) ||
    "";
  const display =
    (typeof data.displayName === "string" && data.displayName.trim()) ||
    (typeof data.nickname === "string" && data.nickname.trim()) ||
    (typeof data.name === "string" && data.name.trim()) ||
    "";
  return { display, email };
}

function assertActorIsHubStaff(actorSnap: DocumentSnapshot): void {
  if (!actorSnap.exists) {
    throw new HttpsError("permission-denied", "팀 멤버가 아닙니다.");
  }
  const role = (actorSnap.get("role") as string | undefined)?.trim();
  const status = (actorSnap.get("status") as string | undefined)?.trim();
  const accessLevel = (actorSnap.get("accessLevel") as string | undefined)?.trim();
  if (status !== "active") {
    throw new HttpsError("permission-denied", "비활성 멤버입니다.");
  }
  const roleLc = role ? role.toLowerCase() : "";
  const staffByRole = !!role && (HUB_STAFF_ROLES.has(role) || HUB_STAFF_ROLES.has(roleLc));
  const staffByAccess = accessLevel === "ADMIN";
  if (!staffByRole && !staffByAccess) {
    throw new HttpsError("permission-denied", "가입 승인·거절 권한이 없습니다.");
  }
}

export const approveTeamJoinRequest = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const actorUid = requireAuthUid(request);
  const raw = request.data as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }
  const requestId = assertNonEmptyString(raw.requestId, "requestId");

  const firestore = getFirestore();
  const requestRef = firestore.doc(`teamJoinRequests/${requestId}`);

  let idempotent = false;

  await firestore.runTransaction(async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists) {
      throw new HttpsError("not-found", "가입 요청을 찾을 수 없습니다.");
    }
    const reqData = reqSnap.data()!;
    const teamId = reqData.teamId as string;
    const userId = reqData.userId as string;
    const status = reqData.status as string | undefined;

    if (!teamId || !userId) {
      throw new HttpsError("failed-precondition", "요청 데이터가 올바르지 않습니다.");
    }

    const actorMemberRef = firestore.doc(`teams/${teamId}/members/${actorUid}`);
    const memberRef = firestore.doc(`teams/${teamId}/members/${userId}`);
    const teamMemberRef = firestore.doc(`team_members/${teamId}_${userId}`);
    const teamRef = firestore.doc(`teams/${teamId}`);

    const [actorSnap, memberSnap, teamSnap] = await Promise.all([
      tx.get(actorMemberRef),
      tx.get(memberRef),
      tx.get(teamRef),
    ]);

    assertActorIsHubStaff(actorSnap);

    /** 멱등: 중복 클릭·재시도 시 이미 승인+멤버 반영됨 → 쓰기 없이 성공 */
    if (status === "approved" && memberSnap.exists) {
      idempotent = true;
      logger.info("[approveTeamJoinRequest] idempotent skip (already approved)", {
        requestId,
        actorUid,
        teamId,
        userId,
      });
      return;
    }

    if (status === "rejected") {
      throw new HttpsError("failed-precondition", "이미 거절된 요청입니다.");
    }

    if (status === "approved" && !memberSnap.exists) {
      const legacyTeamMemberRef = firestore.doc(`team_members/${userId}_${teamId}`);
      const [primaryIdxSnap, legacyIdxSnap] = await Promise.all([
        tx.get(teamMemberRef),
        tx.get(legacyTeamMemberRef),
      ]);
      const idxSnap = primaryIdxSnap.exists ? primaryIdxSnap : legacyIdxSnap;

      if (idxSnap.exists) {
        const id = idxSnap.data() as Record<string, unknown>;
        const displayForMember =
          (typeof id.name === "string" && id.name.trim()) ||
          (typeof id.displayName === "string" && id.displayName.trim()) ||
          (typeof id.userName === "string" && id.userName.trim()) ||
          "이름 없음";
        const emailForMember =
          (typeof id.email === "string" && id.email.trim()) ||
          (typeof id.userEmail === "string" && id.userEmail.trim()) ||
          "";

        const memberWrite: Record<string, unknown> = {
          uid: userId,
          userId,
          role: (typeof id.role === "string" && id.role.trim()) || "member",
          status: "active",
          joinedAt: id.joinedAt || FieldValue.serverTimestamp(),
          displayName: displayForMember,
          userName: displayForMember,
          name: displayForMember,
          repairedFromJoinRequestIdempotent: true,
        };
        if (emailForMember) {
          memberWrite.email = emailForMember;
          memberWrite.userEmail = emailForMember;
        }
        tx.set(memberRef, memberWrite, { merge: true });
        logger.info("[approveTeamJoinRequest] repaired missing SoT member from team_members index", {
          requestId,
          teamId,
          userId,
        });
        return;
      }

      logger.warn("[approveTeamJoinRequest] approved but member + index missing — manual repair", {
        requestId,
        teamId,
        userId,
      });
    }

    if (status !== "pending") {
      idempotent = true;
      logger.info("[approveTeamJoinRequest] idempotent skip (non-pending state)", {
        requestId,
        status: status ?? null,
      });
      return;
    }

    if (memberSnap.exists) {
      throw new HttpsError("already-exists", "이미 팀원으로 등록되어 있습니다.");
    }

    const teamName = teamSnap.exists ? String(teamSnap.get("name") || "") : "";
    const pushBody = teamName
      ? `🎉 ${teamName} 팀 가입이 승인되었어요! 이제 팀원으로 활동할 수 있어요.`
      : "🎉 팀 가입이 승인되었어요! 이제 팀원으로 활동할 수 있어요.";

    /** 가입 요청 시 신청자가 적은 표시명·이메일 — users 문서 없어도 허브·멤버 탭에 표시 */
    let reqUserName =
      typeof reqData.userName === "string" && reqData.userName.trim()
        ? String(reqData.userName).trim().slice(0, 200)
        : "";
    let reqUserEmail =
      typeof reqData.userEmail === "string" && reqData.userEmail.trim()
        ? String(reqData.userEmail).trim().slice(0, 320)
        : "";

    if (!reqUserName || !reqUserEmail) {
      const userSnap = await tx.get(firestore.doc(`users/${userId}`));
      if (userSnap.exists) {
        const { display, email } = pickDisplayAndEmailFromUserDoc(
          userSnap.data() as Record<string, unknown>
        );
        if (!reqUserName) {
          reqUserName = (display || (email ? email.split("@")[0]! : "") || "").slice(0, 200);
        }
        if (!reqUserEmail && email) {
          reqUserEmail = email.slice(0, 320);
        }
      }
    }
    if (!reqUserName || !reqUserEmail) {
      const profSnap = await tx.get(firestore.doc(`userProfiles/${userId}`));
      if (profSnap.exists) {
        const { display, email } = pickDisplayAndEmailFromUserDoc(
          profSnap.data() as Record<string, unknown>
        );
        if (!reqUserName) {
          reqUserName = (display || (email ? email.split("@")[0]! : "") || "").slice(0, 200);
        }
        if (!reqUserEmail && email) {
          reqUserEmail = email.slice(0, 320);
        }
      }
    }

    const displayForMember = reqUserName.trim() || "이름 없음";
    const emailForMember = reqUserEmail.trim();

    const notificationRef = firestore.collection("notifications").doc();
    const auditRef = firestore.collection(`teams/${teamId}/auditLogs`).doc();

    tx.update(requestRef, {
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const memberWrite: Record<string, unknown> = {
      uid: userId,
      userId,
      role: "member",
      joinedAt: FieldValue.serverTimestamp(),
      status: "active",
      displayName: displayForMember,
      userName: displayForMember,
      name: displayForMember,
    };
    if (emailForMember) {
      memberWrite.email = emailForMember;
    }
    tx.set(memberRef, memberWrite);

    const teamMemberWrite: Record<string, unknown> = {
      teamId,
      uid: userId,
      userId,
      role: "member",
      status: "active",
      joinedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      displayName: displayForMember,
      userName: displayForMember,
      name: displayForMember,
    };
    if (emailForMember) {
      teamMemberWrite.userEmail = emailForMember;
      teamMemberWrite.email = emailForMember;
    }
    tx.set(teamMemberRef, teamMemberWrite);

    tx.set(notificationRef, {
      userId,
      type: "TEAM_JOIN_APPROVED",
      title: "팀 가입 승인 🎉",
      teamId,
      /** sendPushOnNotificationCreate: status가 명시되지 않으면 queued로 간주되나, 계약을 명확히 */
      status: "queued",
      /** 동일 승인에 대해 FCM 1회만 (재시도·중복 트리거 방지) */
      pushDedupKey: `join_approved:${requestId}`,
      message: pushBody,
      body: pushBody,
      /** TeamHome: onboarding=1 배너·온보딩 흐름과 정렬 — FCM data.route로 전달 */
      link: `/team/${teamId}?onboarding=1`,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(auditRef, {
      action: "approve_team_join_request",
      actorUserId: actorUid,
      targetUserId: userId,
      requestId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  logger.info("[approveTeamJoinRequest] ok", { requestId, actorUid, idempotent });
  return { ok: true, idempotent };
});

export const rejectTeamJoinRequest = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const actorUid = requireAuthUid(request);
  const raw = request.data as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }
  const requestId = assertNonEmptyString(raw.requestId, "requestId");
  const teamNameRaw = typeof raw.teamName === "string" ? raw.teamName.trim() : "";
  const teamName = teamNameRaw || "팀";
  const reason = typeof raw.reason === "string" && raw.reason.trim() ? raw.reason.trim().slice(0, 500) : null;

  const firestore = getFirestore();
  const requestRef = firestore.doc(`teamJoinRequests/${requestId}`);

  let idempotent = false;

  await firestore.runTransaction(async (tx) => {
    const reqSnap = await tx.get(requestRef);
    if (!reqSnap.exists) {
      throw new HttpsError("not-found", "가입 요청을 찾을 수 없습니다.");
    }
    const reqData = reqSnap.data()!;
    const teamId = reqData.teamId as string;
    const userId = reqData.userId as string;
    const status = reqData.status as string | undefined;

    if (!teamId || !userId) {
      throw new HttpsError("failed-precondition", "요청 데이터가 올바르지 않습니다.");
    }

    const actorMemberRef = firestore.doc(`teams/${teamId}/members/${actorUid}`);
    const actorSnap = await tx.get(actorMemberRef);
    assertActorIsHubStaff(actorSnap);

    /** 멱등: 이미 거절됨 → 알림·감사 중복 없이 성공 */
    if (status === "rejected") {
      idempotent = true;
      logger.info("[rejectTeamJoinRequest] idempotent skip (already rejected)", {
        requestId,
        actorUid,
        teamId,
      });
      return;
    }

    if (status === "approved") {
      throw new HttpsError("failed-precondition", "이미 승인된 요청은 거절할 수 없습니다.");
    }

    if (status !== "pending") {
      idempotent = true;
      logger.info("[rejectTeamJoinRequest] idempotent skip (non-pending state)", {
        requestId,
        status: status ?? null,
      });
      return;
    }

    const notificationRef = firestore.collection("notifications").doc();
    const auditRef = firestore.collection(`teams/${teamId}/auditLogs`).doc();

    tx.update(requestRef, {
      status: "rejected",
      rejectedAt: FieldValue.serverTimestamp(),
      rejectedBy: actorUid,
      reason,
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(notificationRef, {
      userId,
      type: "TEAM_JOIN_REJECTED",
      title: "팀 가입 안내",
      teamId,
      pushDedupKey: `join_rejected:${requestId}`,
      message: `${teamName} 팀 가입이 거절되었습니다.`,
      link: `/my-teams`,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(auditRef, {
      action: "reject_team_join_request",
      actorUserId: actorUid,
      targetUserId: userId,
      requestId,
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  logger.info("[rejectTeamJoinRequest] ok", { requestId, actorUid, idempotent });
  return { ok: true, idempotent };
});
