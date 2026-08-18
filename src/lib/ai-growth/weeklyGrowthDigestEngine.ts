import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { buildAvatarGrowthRecommendations } from "@/lib/ai-growth/avatarGrowthRecommendationEngine";
import type { GrowthAvatarLevel } from "@/lib/ai-growth/growthAvatarLevel";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type {
  WeeklyDigestSummary,
  WeeklyGrowthDigestEnrichment,
} from "@/lib/ai-growth/weeklyDigestTypes";

const FOCUS_STAT_SHORT = {
  vision: "Vision",
  pressure: "Pressure",
  recovery: "Recovery",
} as const;

function badgesUnlockedInWeek(
  avatar: PlayerGrowthAvatarDoc,
  weekStartMs: number,
  weekEndMs: number
): string[] {
  const at = avatar.lastBadgeUnlockAt;
  if (!at || !avatar.lastUnlockedBadges?.length) return [];
  if (at < weekStartMs || at > weekEndMs) return [];
  return avatar.lastUnlockedBadges.map((id) => badgeMetaById(id).labelKo);
}

function resolveTimelineWeekDelta(
  timeline: PlayerGrowthTimeline | null,
  weekStartMs: number,
  weekEndMs: number
): number | null {
  if (!timeline?.points.length) return null;
  const inWeek = timeline.points.filter((p) => {
    const ms = Date.parse(`${p.sessionDate}T12:00:00+09:00`);
    return Number.isFinite(ms) && ms >= weekStartMs && ms <= weekEndMs;
  });
  if (inWeek.length >= 2) {
    const first = inWeek[0]!.score;
    const last = inWeek[inWeek.length - 1]!.score;
    return last - first;
  }
  return timeline.deltaScore;
}

function formatNextLevelGoal(avatar: PlayerGrowthAvatarDoc): string | null {
  const level = avatar.level as GrowthAvatarLevel;
  if (level >= 5) return null;
  const targets: Record<GrowthAvatarLevel, number | null> = {
    1: 75,
    2: 80,
    3: 85,
    4: 90,
    5: null,
  };
  const target = targets[level];
  if (target == null || avatar.ovr >= target) return null;
  return `OVR ${target} → Level ${level + 1}`;
}

/** Avatar · Timeline · Recommendation → 주간 enrichment */
export function buildWeeklyGrowthDigestEnrichment(input: {
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
  digestSummary: Pick<WeeklyDigestSummary, "scoreCurrent" | "scorePrevious" | "delta">;
  weekStartMs: number;
  weekEndMs: number;
}): WeeklyGrowthDigestEnrichment {
  const { avatar, timeline, digestSummary, weekStartMs, weekEndMs } = input;

  const timelineDelta = resolveTimelineWeekDelta(timeline, weekStartMs, weekEndMs);
  const ovrDelta =
    typeof avatar.weeklyDeltaOvr === "number"
      ? avatar.weeklyDeltaOvr
      : timelineDelta ?? digestSummary.delta;

  const ovrAfter = avatar.ovr;
  const ovrBefore =
    ovrDelta !== null && Number.isFinite(ovrAfter) ? Math.max(0, ovrAfter - ovrDelta) : null;

  const recBundle = buildAvatarGrowthRecommendations(avatar, 5);
  const focusRecommendation = recBundle.primaryStat
    ? FOCUS_STAT_SHORT[recBundle.primaryStat]
    : null;

  const levelRec = recBundle.recommendations.find((r) => r.kind === "level");
  const nextGoal = levelRec
    ? formatNextLevelGoal(avatar) ?? levelRec.title.replace(/^Level /, "Level ")
    : formatNextLevelGoal(avatar);

  return {
    ovrBefore,
    ovrAfter,
    ovrDelta: ovrDelta ?? null,
    newBadges: badgesUnlockedInWeek(avatar, weekStartMs, weekEndMs),
    focusRecommendation,
    nextGoal,
    timelineDelta: timelineDelta ?? null,
  };
}

export function enrichWeeklyDigestSummary(input: {
  summary: WeeklyDigestSummary;
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
  weekStartMs: number;
  weekEndMs: number;
}): WeeklyDigestSummary {
  const growth = buildWeeklyGrowthDigestEnrichment({
    avatar: input.avatar,
    timeline: input.timeline,
    digestSummary: input.summary,
    weekStartMs: input.weekStartMs,
    weekEndMs: input.weekEndMs,
  });
  return { ...input.summary, growth };
}

export function formatWeeklyOvrLine(growth: WeeklyGrowthDigestEnrichment | undefined): string | null {
  if (!growth) return null;
  if (growth.ovrBefore !== null && growth.ovrAfter !== null) {
    return `${growth.ovrBefore} → ${growth.ovrAfter}`;
  }
  if (growth.ovrAfter !== null) return String(growth.ovrAfter);
  return null;
}

/** PDF export — avatar + timeline 기반 주간 enrichment */
export function buildWeeklyGrowthDigestForPdfExport(input: {
  avatar: PlayerGrowthAvatarDoc | null;
  timeline: PlayerGrowthTimeline | null;
  weekStartMs?: number;
  weekEndMs?: number;
}): WeeklyGrowthDigestEnrichment | null {
  if (!input.avatar) return null;
  const now = Date.now();
  const weekEndMs = input.weekEndMs ?? now;
  const weekStartMs = input.weekStartMs ?? now - 7 * 24 * 60 * 60 * 1000;
  return buildWeeklyGrowthDigestEnrichment({
    avatar: input.avatar,
    timeline: input.timeline,
    digestSummary: {
      scoreCurrent: input.avatar.ovr,
      scorePrevious: null,
      delta: input.avatar.weeklyDeltaOvr ?? null,
    },
    weekStartMs,
    weekEndMs,
  });
}
