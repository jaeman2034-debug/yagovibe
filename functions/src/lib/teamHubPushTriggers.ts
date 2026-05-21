/**
 * 팀 운영 경로(teams/{teamId}/...) Firestore 트리거 → FCM
 * — 클라에서 push 직접 호출 금지, 대상 필터는 서버에서만
 */
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { getFcmTokensForUser } from "./fcmUserTokens";
import { INVALID_FCM_REGISTRATION_ERROR_CODES } from "./cleanupInvalidFcmTokensForUser";
import { applyDeferredInvalidFcmTokenCleanup } from "./fcmInvalidTokenDeferred";
import { tryClaimPushDedup } from "./pushNotificationDedup";

const REGION = "asia-northeast3";
const WEB_ICON = "/icons/icon-maskable-512.png";

/** 팀 활동 문서: audience (미설정 시 team = 기존 동작) */
type ActivityAudience = "team" | "players" | "parents";

function strData(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v && typeof v === "object" && "seconds" in (v as Record<string, unknown>)) {
    const s = (v as { seconds?: number }).seconds;
    return s != null ? String(s) : "";
  }
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

function normalizeAttendanceStatus(d: Record<string, unknown> | undefined): string {
  if (!d) return "";
  return String((d.status as string) || (d.attendanceStatus as string) || "").trim();
}

async function sendFcmToUser(
  db: Firestore,
  uid: string,
  opts: {
    title: string;
    body: string;
    link: string;
    data: Record<string, string>;
  }
): Promise<void> {
  const messaging = getMessaging();
  const tokens = await getFcmTokensForUser(db, uid);
  if (tokens.length === 0) return;

  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: { title: opts.title, body: opts.body },
      webpush: {
        notification: {
          title: opts.title,
          body: opts.body,
          icon: WEB_ICON,
          badge: WEB_ICON,
        },
        fcmOptions: { link: opts.link },
      },
      data: { ...opts.data, route: opts.link },
    });

    const invalid: string[] = [];
    response.responses.forEach((r, idx) => {
      const code = (r.error as { code?: string } | undefined)?.code;
      if (!r.success && code && INVALID_FCM_REGISTRATION_ERROR_CODES.has(code)) {
        invalid.push(chunk[idx]);
      }
    });
    if (invalid.length > 0) {
      await applyDeferredInvalidFcmTokenCleanup(db, uid, invalid);
    }
  }
}

/**
 * visibility / 공지 여부에 따라 수신 UID 목록
 * - parents → role parent 만
 * - players → role player 만
 * - team(기본) → 공지면 전원(코치 포함), 그 외 코치 제외
 */
async function collectActivityRecipientUserIds(
  db: Firestore,
  teamId: string,
  opts: { visibility: ActivityAudience | undefined; isNotice: boolean }
): Promise<string[]> {
  const snap = await db
    .collection("teams")
    .doc(teamId)
    .collection("members")
    .where("status", "==", "active")
    .get();

  const vis = opts.visibility || "team";

  if (vis === "parents") {
    return snap.docs.filter((d) => d.data()?.role === "parent").map((d) => d.id);
  }
  if (vis === "players") {
    return snap.docs.filter((d) => d.data()?.role === "player").map((d) => d.id);
  }

  const includeCoach = opts.isNotice;
  const out: string[] = [];
  snap.docs.forEach((d) => {
    const role = (d.data()?.role as string) || "";
    if (!includeCoach && role === "coach") return;
    out.push(d.id);
  });
  return [...new Set(out)];
}

async function collectParentUserIdsForPlayer(
  db: Firestore,
  teamId: string,
  playerUserId: string
): Promise<string[]> {
  const snap = await db
    .collection("teams")
    .doc(teamId)
    .collection("parentLinks")
    .where("playerUserId", "==", playerUserId)
    .get();

  const ids: string[] = [];
  snap.docs.forEach((doc) => {
    const pid = doc.data()?.parentUserId as string | undefined;
    if (pid && typeof pid === "string") ids.push(pid);
  });
  return [...new Set(ids)];
}

function parseVisibility(raw: unknown): ActivityAudience | undefined {
  if (raw === "team" || raw === "players" || raw === "parents") return raw;
  return undefined;
}

/** ① 훈련/활동 생성 — visibility·공지(type) 반영 */
export const teamHubActivityCreatedNotify = onDocumentCreated(
  {
    document: "teams/{teamId}/activities/{activityId}",
    region: REGION,
  },
  async (event) => {
    const db = getFirestore();
    const { teamId, activityId } = event.params;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const activityType = (data.type as string) || "";
    const isNotice = activityType === "notice";
    const title = (data.title as string) || "팀 알림";
    const summary = (data.summary as string) || "";
    const visibility = parseVisibility(data.visibility);

    const userIds = await collectActivityRecipientUserIds(db, teamId, {
      visibility,
      isNotice,
    });
    if (userIds.length === 0) {
      logger.info("[teamHubActivityCreatedNotify] no recipients", { teamId, activityId });
      return;
    }

    const dedupKey = `teamHubActivity_v1_${teamId}_${activityId}`;
    const claimed = await tryClaimPushDedup(db, dedupKey, {
      kind: "teamHubActivityCreated",
      teamId: String(teamId),
      activityId: String(activityId),
    });
    if (!claimed) return;

    const link = `/team/${teamId}/activities/${activityId}`;
    const body = summary || (isNotice ? "새 공지가 등록되었습니다." : "새 훈련·일정이 등록되었습니다.");
    const pushType = isNotice ? "team_notice" : "activity_created";

    const payload: Record<string, string> = {
      type: pushType,
      teamId: strData(teamId),
      activityId: strData(activityId),
      title: strData(title),
      startAt: strData(data.startAt),
      visibility: strData(visibility || "team"),
    };

    await Promise.all(
      userIds.map((uid) =>
        sendFcmToUser(db, uid, {
          title,
          body,
          link,
          data: payload,
        })
      )
    );

    logger.info("[teamHubActivityCreatedNotify] sent", {
      teamId,
      activityId,
      type: activityType,
      visibility: visibility || "team",
      recipients: userIds.length,
    });
  }
);

/** ② 출석 — status 실질 변경 또는 최초 생성 시만 푸시 */
export const teamHubAttendanceWrittenNotify = onDocumentWritten(
  {
    document: "teams/{teamId}/activities/{activityId}/attendance/{playerUserId}",
    region: REGION,
  },
  async (event) => {
    const db = getFirestore();
    const { teamId, activityId, playerUserId } = event.params;
    const change = event.data;
    if (!change) return;

    const afterSnap = change.after;
    if (!afterSnap.exists) return;

    const after = afterSnap.data() as Record<string, unknown>;
    const before = change.before.exists ? (change.before.data() as Record<string, unknown>) : undefined;

    const beforeStatus = normalizeAttendanceStatus(before);
    const afterStatus = normalizeAttendanceStatus(after) || "updated";

    if (change.before.exists && beforeStatus === afterStatus) {
      logger.info("[teamHubAttendanceWrittenNotify] skip same status", {
        teamId,
        activityId,
        playerUserId,
        status: afterStatus,
      });
      return;
    }

    const dedupKey = `teamHubAttendance_v1_${teamId}_${activityId}_${playerUserId}_${beforeStatus || "_"}_${afterStatus}`;
    const claimed = await tryClaimPushDedup(db, dedupKey, {
      kind: "teamHubAttendance",
      teamId: String(teamId),
      activityId: String(activityId),
      playerUserId: String(playerUserId),
    });
    if (!claimed) return;

    const parentIds = await collectParentUserIdsForPlayer(db, teamId, playerUserId);
    const recipients = [...new Set([playerUserId, ...parentIds])];

    const title = "출석 알림";
    const body =
      afterStatus === "present"
        ? "출석이 ‘참석’으로 반영되었습니다."
        : afterStatus === "absent"
          ? "출석이 ‘불참’으로 반영되었습니다."
          : "출석 정보가 업데이트되었습니다.";

    const link = `/team/${teamId}/activities/${activityId}?tab=attendance`;
    const payload: Record<string, string> = {
      type: "attendance_updated",
      teamId: strData(teamId),
      activityId: strData(activityId),
      playerUserId: strData(playerUserId),
      status: strData(afterStatus),
    };

    await Promise.all(
      recipients.map((uid) =>
        sendFcmToUser(db, uid, {
          title,
          body,
          link,
          data: payload,
        })
      )
    );

    logger.info("[teamHubAttendanceWrittenNotify] sent", {
      teamId,
      activityId,
      playerUserId,
      recipients: recipients.length,
    });
  }
);

/** ④ 부모–선수 연결 완료 → 부모 온보딩 푸시 */
export const teamParentLinkCreatedNotify = onDocumentCreated(
  {
    document: "teams/{teamId}/parentLinks/{linkId}",
    region: REGION,
  },
  async (event) => {
    const db = getFirestore();
    const { teamId, linkId } = event.params;
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const parentUserId = data.parentUserId as string | undefined;
    if (!parentUserId || typeof parentUserId !== "string") {
      logger.warn("[teamParentLinkCreatedNotify] missing parentUserId", { teamId, linkId });
      return;
    }

    const dedupKey = `teamParentLink_v1_${teamId}_${linkId}`;
    const claimed = await tryClaimPushDedup(db, dedupKey, {
      kind: "teamParentLinkCreated",
      teamId: String(teamId),
      linkId: String(linkId),
    });
    if (!claimed) return;

    const teamSnap = await db.collection("teams").doc(teamId).get();
    const teamName = (teamSnap.data()?.name as string) || "팀";

    const title = "자녀 연결이 완료되었습니다";
    const body = `${teamName}에서 보호자로 등록되었습니다. 일정·출석 알림을 받을 수 있어요.`;
    const link = `/team/${teamId}/overview`;
    const payload: Record<string, string> = {
      type: "parent_link_created",
      teamId: strData(teamId),
      linkId: strData(linkId),
      playerUserId: strData(data.playerUserId),
    };

    await sendFcmToUser(db, parentUserId, {
      title,
      body,
      link,
      data: payload,
    });

    logger.info("[teamParentLinkCreatedNotify] sent", { teamId, linkId, parentUserId });
  }
);
