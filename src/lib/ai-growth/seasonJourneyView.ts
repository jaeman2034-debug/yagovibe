/**
 * J2-2 — Season Journey read-only projection (playerGrowthHistory + playerGrowthAvatar)
 */
import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import {
  canShowGrowthTimelineChart,
  formatGrowthTimelineScoreChain,
} from "@/lib/ai-growth/growthTimelineDisplay";
import type { GrowthTimelinePoint, PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const SEASON_JOURNEY_TIMELINE_LIMIT = 10;

export const SEASON_JOURNEY_EMPTY_CHART_MESSAGE =
  "성장 이력이 충분히 쌓이면 시즌 곡선을 확인할 수 있습니다." as const;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type SeasonJourneyView = {
  currentOvr: number;
  bestOvr: number;
  delta30d: number | null;
  delta30dLabel: string;
  scoreChain: number[];
  scoreChainLabel: string;
  badgeLabels: string[];
  badgeCount: number;
  canShowChart: boolean;
  emptyChartMessage: string;
  timelinePoints: GrowthTimelinePoint[];
};

function parseSessionDateMs(sessionDate: string): number {
  return new Date(`${sessionDate}T00:00:00`).getTime();
}

function formatSignedDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

/** 30일 이전(또는 동일) 포인트 중 가장 최근 score · 없으면 가장 오래된 포인트 */
export function computeSeasonJourneyBaselineOvr(
  points: GrowthTimelinePoint[],
  now = Date.now()
): number | null {
  if (points.length === 0) return null;

  const cutoff = now - THIRTY_DAYS_MS;
  let baseline: GrowthTimelinePoint | null = null;

  for (const point of points) {
    if (parseSessionDateMs(point.sessionDate) <= cutoff) {
      baseline = point;
    }
  }

  return baseline?.score ?? points[0]!.score;
}

export function computeSeasonJourneyDelta30d(
  currentOvr: number,
  points: GrowthTimelinePoint[],
  now = Date.now()
): number | null {
  const baseline = computeSeasonJourneyBaselineOvr(points, now);
  if (baseline == null) return null;
  return currentOvr - baseline;
}

export function computeSeasonJourneyBestOvr(
  currentOvr: number,
  points: GrowthTimelinePoint[]
): number {
  const scores = points.map((p) => p.score);
  if (scores.length === 0) return currentOvr;
  return Math.max(currentOvr, ...scores);
}

export function buildSeasonJourneyView(input: {
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
  now?: number;
}): SeasonJourneyView {
  const { avatar, timeline, now = Date.now() } = input;
  const timelinePoints = timeline?.points ?? [];
  const currentOvr = avatar.ovr;
  const bestOvr = computeSeasonJourneyBestOvr(currentOvr, timelinePoints);
  const delta30d = computeSeasonJourneyDelta30d(currentOvr, timelinePoints, now);
  const scoreChain = timelinePoints.map((p) => p.score);
  const scoreChainLabel =
    scoreChain.length > 0 ? formatGrowthTimelineScoreChain(scoreChain) : "—";
  const badgeLabels = avatar.badges.map((id) => badgeMetaById(id).labelKo);
  const canShowChart = canShowGrowthTimelineChart(timeline);

  return {
    currentOvr,
    bestOvr,
    delta30d,
    delta30dLabel: delta30d != null ? formatSignedDelta(delta30d) : "—",
    scoreChain,
    scoreChainLabel,
    badgeLabels,
    badgeCount: avatar.badges.length,
    canShowChart,
    emptyChartMessage: SEASON_JOURNEY_EMPTY_CHART_MESSAGE,
    timelinePoints,
  };
}
