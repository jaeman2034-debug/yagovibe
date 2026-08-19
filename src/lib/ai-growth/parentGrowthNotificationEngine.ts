/**
 * J1-2 — Parent Growth Notification engine (D-5.2 + J1-2a composite)
 */
import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { isRecentBadgeUnlock } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import { isRecentLevelUp } from "@/lib/ai-growth/growthAvatarLevelUp";
import { isRecentOvrMilestone } from "@/lib/ai-growth/growthAvatarOvrMilestone";
import type {
  ParentHomeGrowthSummarySlice,
  ParentHomeWeeklyDigestSlice,
} from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import { buildParentWeeklyGrowthDigestView } from "@/lib/ai-growth/parentWeeklyGrowthDigestView";
import {
  buildParentGrowthNotificationId,
  PARENT_GROWTH_NOTIFICATION_WINDOW_MS,
  type ParentGrowthNotification,
} from "@/lib/ai-growth/parentGrowthNotificationTypes";

export type ParentGrowthNotificationSource = {
  teamId: string;
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  growthSummary?: ParentHomeGrowthSummarySlice;
  timeline?: PlayerGrowthTimeline | null;
  weeklyDigest?: ParentHomeWeeklyDigestSlice | null;
};

function isWithinNotificationWindow(occurredAt: number | undefined, now: number): boolean {
  if (!occurredAt || !Number.isFinite(occurredAt)) return false;
  return now - occurredAt <= PARENT_GROWTH_NOTIFICATION_WINDOW_MS;
}

function displayName(source: ParentGrowthNotificationSource): string {
  return source.playerName.trim() || source.avatar.playerName || "자녀";
}

function resolveGrowthSummary(source: ParentGrowthNotificationSource): ParentHomeGrowthSummarySlice {
  return source.growthSummary ?? { mode: "none" };
}

function formatOvrRiseSentence(from: number, to: number): string {
  return `OVR이 ${from} → ${to}로 상승했습니다.`;
}

function resolveOvrRiseBounds(avatar: PlayerGrowthAvatarDoc): { from: number; to: number } | null {
  const delta = avatar.weeklyDeltaOvr;
  const to = avatar.ovr;
  if (typeof delta === "number" && delta > 0 && Number.isFinite(to)) {
    return { from: Math.max(0, to - delta), to };
  }
  if (
    typeof avatar.lastOvrMilestoneFrom === "number" &&
    typeof avatar.lastOvrMilestoneTo === "number" &&
    avatar.lastOvrMilestoneTo > avatar.lastOvrMilestoneFrom
  ) {
    return { from: avatar.lastOvrMilestoneFrom, to: avatar.lastOvrMilestoneTo };
  }
  return null;
}

function resolveCompositeOccurredAt(source: ParentGrowthNotificationSource): number {
  const { avatar } = source;
  const candidates = [
    avatar.lastBadgeUnlockAt,
    avatar.lastLevelUpAt,
    avatar.lastOvrMilestoneAt,
    avatar.updatedAt,
  ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return candidates.length > 0 ? Math.max(...candidates) : Date.now();
}

function buildDigestLinesFromView(
  digestView: ReturnType<typeof buildParentWeeklyGrowthDigestView>
): string[] {
  const lines: string[] = [];
  const ovrBounds = digestView.ovrHeadline?.match(/OVR (\d+) → (\d+)/);
  if (ovrBounds) {
    lines.push(formatOvrRiseSentence(Number(ovrBounds[1]), Number(ovrBounds[2])));
  } else if (digestView.ovrHeadline) {
    lines.push(digestView.ovrHeadline);
  }
  if (digestView.badgeLine) lines.push(digestView.badgeLine);
  if (digestView.nextGoalLine) lines.push(digestView.nextGoalLine);
  return lines;
}

/** J1-2a — composite digest notification (projection · no SoT) */
export function buildWeeklyGrowthDigestNotification(
  source: ParentGrowthNotificationSource,
  now = Date.now()
): ParentGrowthNotification | null {
  const digestView = buildParentWeeklyGrowthDigestView({
    playerName: source.playerName,
    avatar: source.avatar,
    growthSummary: resolveGrowthSummary(source),
    timeline: source.timeline ?? null,
    weeklyDigest: source.weeklyDigest ?? null,
  });

  if (digestView.isEmpty) return null;

  const digestLines = buildDigestLinesFromView(digestView);
  if (digestLines.length === 0) return null;

  const occurredAt = resolveCompositeOccurredAt(source);
  if (!isWithinNotificationWindow(occurredAt, now)) return null;

  const name = displayName(source);
  return {
    id: buildParentGrowthNotificationId({
      teamId: source.teamId,
      playerId: source.playerId,
      type: "WEEKLY_GROWTH_DIGEST",
      occurredAt,
    }),
    type: "WEEKLY_GROWTH_DIGEST",
    teamId: source.teamId,
    playerId: source.playerId,
    playerName: name,
    occurredAt,
    emoji: "🎉",
    title: "이번 주 성장 알림",
    body: digestLines[0] ?? "이번 주 성장 알림",
    digestLines,
    weekKey: digestView.weekKey,
  };
}

/** Atomic notifications — always emitted (smoke · fallback when no composite) */
export function buildAtomicParentGrowthNotifications(
  source: ParentGrowthNotificationSource,
  now = Date.now()
): ParentGrowthNotification[] {
  const { teamId, playerId, avatar } = source;
  const name = displayName(source);
  const items: ParentGrowthNotification[] = [];

  const ovrRise = resolveOvrRiseBounds(avatar);
  const ovrOccurredAt =
    avatar.lastOvrMilestoneAt ?? avatar.updatedAt ?? now;
  if (
    ovrRise &&
    isWithinNotificationWindow(ovrOccurredAt, now) &&
    ((avatar.weeklyDeltaOvr != null && avatar.weeklyDeltaOvr > 0) ||
      isRecentOvrMilestone(avatar.lastOvrMilestoneAt, now))
  ) {
    items.push({
      id: buildParentGrowthNotificationId({
        teamId,
        playerId,
        type: "OVR_MILESTONE",
        occurredAt: ovrOccurredAt,
      }),
      type: "OVR_MILESTONE",
      teamId,
      playerId,
      playerName: name,
      occurredAt: ovrOccurredAt,
      emoji: "📈",
      title: "OVR 상승",
      body: formatOvrRiseSentence(ovrRise.from, ovrRise.to),
      ovrFrom: ovrRise.from,
      ovrTo: ovrRise.to,
    });
  }

  if (
    isRecentBadgeUnlock(avatar.lastBadgeUnlockAt, now) &&
    isWithinNotificationWindow(avatar.lastBadgeUnlockAt, now) &&
    avatar.lastUnlockedBadges?.length
  ) {
    const occurredAt = avatar.lastBadgeUnlockAt!;
    const labels = avatar.lastUnlockedBadges.map((id) => badgeMetaById(id).labelKo);
    items.push({
      id: buildParentGrowthNotificationId({ teamId, playerId, type: "BADGE_UNLOCK", occurredAt }),
      type: "BADGE_UNLOCK",
      teamId,
      playerId,
      playerName: name,
      occurredAt,
      emoji: "🏅",
      title: "새로운 배지",
      body:
        labels.length === 1
          ? `${labels[0]} 배지를 획득했습니다.`
          : `${labels.join(", ")} 배지를 획득했습니다.`,
      badgeIds: avatar.lastUnlockedBadges,
    });
  }

  if (
    isRecentLevelUp(avatar.lastLevelUpAt, now) &&
    isWithinNotificationWindow(avatar.lastLevelUpAt, now) &&
    typeof avatar.level === "number"
  ) {
    const occurredAt = avatar.lastLevelUpAt!;
    items.push({
      id: buildParentGrowthNotificationId({ teamId, playerId, type: "LEVEL_UP", occurredAt }),
      type: "LEVEL_UP",
      teamId,
      playerId,
      playerName: name,
      occurredAt,
      emoji: "🎉",
      title: "레벨업",
      body:
        typeof avatar.lastLevel === "number"
          ? `Level ${avatar.lastLevel} → Level ${avatar.level}`
          : `${name}이 Level ${avatar.level}에 도달했습니다.`,
      level: avatar.level,
    });
  }

  return items;
}

function buildNotificationsForSource(
  source: ParentGrowthNotificationSource,
  now: number
): ParentGrowthNotification[] {
  const composite = buildWeeklyGrowthDigestNotification(source, now);
  if (composite) return [composite];
  return buildAtomicParentGrowthNotifications(source, now);
}

export function buildParentGrowthNotificationsFromAvatar(
  source: ParentGrowthNotificationSource,
  now = Date.now()
): ParentGrowthNotification[] {
  return buildNotificationsForSource(source, now);
}

/** Feed output — composite suppresses atomic duplicates per child */
export function buildParentGrowthNotifications(
  sources: ParentGrowthNotificationSource[],
  now = Date.now()
): ParentGrowthNotification[] {
  const merged = sources.flatMap((source) => buildNotificationsForSource(source, now));
  return merged.sort((a, b) => b.occurredAt - a.occurredAt);
}
