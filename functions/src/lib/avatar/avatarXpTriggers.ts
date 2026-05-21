/**
 * 팀 참여 이벤트 → 아바타 XP (Firestore 트리거)
 */

import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { grantAvatarXp } from "./grantAvatarXp";

const REGION = "asia-northeast3";

const SKIP_ACTIVITY_TYPES = new Set(["member_join", "member_left"]);
/** MVP: 사용자 생성형 활동만 XP (공지 남발·자동 로그 제외) */
const REWARD_ACTIVITY_TYPES = new Set(["event", "match", "post"]);

/** 팀 멤버 SoT 생성(오너 제외) → 가입 XP */
export const onTeamMemberCreatedAvatarXp = onDocumentCreated(
  {
    document: "teams/{teamId}/members/{memberId}",
    region: REGION,
  },
  async (event) => {
    const db = getFirestore();
    const teamId = String(event.params.teamId);
    const uid = String(event.params.memberId);
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const status = String(data.status ?? "").toLowerCase();
    if (status !== "active") return;

    const role = String(data.role ?? "").toLowerCase();
    if (role === "owner") return;

    /** 팀당 uid 1회 — 탈퇴/재가입 파밍 방지 */
    const idempotencyKey = `team_membership_join:${teamId}:${uid}`;
    const res = await grantAvatarXp(db, {
      uid,
      source: "team_membership_join",
      idempotencyKey,
      context: { teamId, trigger: "teams_members_created" },
    });
    if (!res.ok && !res.skipped) {
      logger.warn("[onTeamMemberCreatedAvatarXp] grant failed", { teamId, uid, res });
    }
  },
);

/** 일정 RSVP 참석(going) 확정 */
export const onTeamScheduledRsvpAvatarXp = onDocumentWritten(
  {
    document: "teams/{teamId}/scheduled_matches/{fixtureId}/participants/{participantId}",
    region: REGION,
  },
  async (event) => {
    const db = getFirestore();
    const change = event.data;
    if (!change?.after.exists) return;

    const after = change.after.data() as Record<string, unknown>;
    const before = change.before.exists ? (change.before.data() as Record<string, unknown>) : undefined;
    const afterStatus = String(after.status ?? "").toLowerCase();
    const beforeStatus = before ? String(before.status ?? "").toLowerCase() : "";

    if (afterStatus !== "going") return;
    if (beforeStatus === "going") return;

    const teamId = String(event.params.teamId);
    const fixtureId = String(event.params.fixtureId);
    const uid = String(event.params.participantId);

    /** 일정(fixture)당 uid 1회 — going↔no 토글 파밍 방지 */
    const idempotencyKey = `team_rsvp_attendance:${teamId}:${fixtureId}:${uid}`;
    const res = await grantAvatarXp(db, {
      uid,
      source: "team_rsvp_attendance",
      idempotencyKey,
      context: { teamId, fixtureId, trigger: "scheduled_match_rsvp" },
    });
    if (!res.ok && !res.skipped) {
      logger.warn("[onTeamScheduledRsvpAvatarXp] grant failed", { teamId, fixtureId, uid, res });
    }
  },
);

/** 팀 허브 활동 피드 작성(자동 멤버 이벤트 제외) */
export const onTeamActivityCreatedAvatarXp = onDocumentCreated(
  {
    document: "teams/{teamId}/activities/{activityId}",
    region: REGION,
  },
  async (event) => {
    const db = getFirestore();
    const data = event.data?.data() as Record<string, unknown> | undefined;
    if (!data) return;

    const type = String(data.type ?? "");
    if (SKIP_ACTIVITY_TYPES.has(type)) return;
    if (!REWARD_ACTIVITY_TYPES.has(type)) return;

    const createdBy = String(data.createdBy ?? "").trim();
    if (!createdBy) return;

    const teamId = String(event.params.teamId);
    const activityId = String(event.params.activityId);

    /** 활동 문서당 작성자 1회 */
    const idempotencyKey = `team_activity_upload:${teamId}:${activityId}`;
    const res = await grantAvatarXp(db, {
      uid: createdBy,
      source: "team_activity_upload",
      idempotencyKey,
      context: { teamId, activityId, activityType: type, trigger: "team_activity_created" },
    });
    if (!res.ok && !res.skipped) {
      logger.warn("[onTeamActivityCreatedAvatarXp] grant failed", { teamId, activityId, createdBy, res });
    }
  },
);
