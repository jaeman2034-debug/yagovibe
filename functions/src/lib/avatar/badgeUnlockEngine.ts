/**
 * XP 부여 성공 후 배지 해제 (Admin 전용). `badges/{uid}` — 클라는 읽기만.
 */

import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import type { AvatarXpSource } from "./avatarXpConfig";

export const AVATAR_BADGE_IDS = [
  "first_join",
  "first_rsvp",
  "recruiter",
  "active_player",
  "content_creator",
] as const;

export type AvatarBadgeId = (typeof AVATAR_BADGE_IDS)[number];

export interface BadgeUnlockStats {
  membershipXpGrants: number;
  rsvpXpGrants: number;
  inviteXpGrants: number;
  activityXpGrants: number;
}

function emptyStats(): BadgeUnlockStats {
  return {
    membershipXpGrants: 0,
    rsvpXpGrants: 0,
    inviteXpGrants: 0,
    activityXpGrants: 0,
  };
}

function readStats(raw: unknown): BadgeUnlockStats {
  const s = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    membershipXpGrants: Math.max(0, Math.floor(Number(s.membershipXpGrants) || 0)),
    rsvpXpGrants: Math.max(0, Math.floor(Number(s.rsvpXpGrants) || 0)),
    inviteXpGrants: Math.max(0, Math.floor(Number(s.inviteXpGrants) || 0)),
    activityXpGrants: Math.max(0, Math.floor(Number(s.activityXpGrants) || 0)),
  };
}

function readUnlockedMap(raw: unknown): Record<string, Record<string, unknown>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, Record<string, unknown>>;
}

function bumpStat(stats: BadgeUnlockStats, source: AvatarXpSource): void {
  switch (source) {
    case "team_membership_join":
      stats.membershipXpGrants += 1;
      break;
    case "team_rsvp_attendance":
      stats.rsvpXpGrants += 1;
      break;
    case "team_invite_success":
      stats.inviteXpGrants += 1;
      break;
    case "team_activity_upload":
      stats.activityXpGrants += 1;
      break;
    default:
      break;
  }
}

/**
 * 실제 XP가 새로 기록된 직후에만 호출한다 (멱등 스킵·no_avatar 제외).
 */
export async function processBadgesAfterXpGrant(
  db: Firestore,
  uid: string,
  source: AvatarXpSource,
  context?: Record<string, unknown>,
): Promise<void> {
  const ref = db.doc(`badges/${uid}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    const stats = snap.exists ? readStats(data.stats) : emptyStats();
    bumpStat(stats, source);

    const unlocked = readUnlockedMap(data.unlocked);
    const patch: Record<string, unknown> = {
      schemaVersion: 1,
      uid,
      stats,
      updatedAt: FieldValue.serverTimestamp(),
    };

    const baseMeta = {
      source,
      context: context && typeof context === "object" ? context : {},
      unlockedAt: FieldValue.serverTimestamp(),
    };

    const add = (badgeId: AvatarBadgeId) => {
      if (unlocked[badgeId]) return;
      unlocked[badgeId] = { ...baseMeta };
    };

    if (stats.membershipXpGrants >= 1) add("first_join");
    if (stats.rsvpXpGrants >= 1) add("first_rsvp");
    if (stats.inviteXpGrants >= 3) add("recruiter");
    if (stats.rsvpXpGrants >= 10) add("active_player");
    if (stats.activityXpGrants >= 5) add("content_creator");

    patch.unlocked = unlocked;
    tx.set(ref, patch, { merge: true });
  });

  logger.info("[processBadgesAfterXpGrant] ok", { uid, source });
}
