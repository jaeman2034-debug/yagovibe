import { ovrToGrowthLevel } from "@/lib/ai-growth/growthAvatarLevel";
import type {
  GrowthTimelinePoint,
  GrowthTrendDirection,
  PlayerGrowthTimeline,
  PlayerGrowthTimelineSummary,
} from "@/lib/ai-growth/growthTimelineTypes";
import { listPlayerGrowthSessionsByPlayerId } from "@/lib/ai-growth/playerGrowthHistoryService";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";

function formatSessionDate(generatedAt: number): string {
  return new Date(generatedAt).toISOString().slice(0, 10);
}

function sessionToTimelinePoint(session: PlayerGrowthSessionDoc): GrowthTimelinePoint | null {
  const score = Math.round(session.metrics.growthScore?.overall ?? 0);
  if (score <= 0) return null;

  const ovr = score;
  return {
    sessionId: session.firestoreDocId || session.sessionId,
    score,
    sessionDate: formatSessionDate(session.generatedAt),
    ovr,
    level: ovrToGrowthLevel(ovr),
  };
}

/** 최신순 포인트 → latest / previous / delta / trend */
export function computeGrowthTimelineSummary(
  pointsNewestFirst: GrowthTimelinePoint[]
): PlayerGrowthTimelineSummary {
  if (pointsNewestFirst.length === 0) {
    return {
      latestScore: null,
      previousScore: null,
      deltaScore: null,
      trendDirection: "stable",
    };
  }

  const latestScore = pointsNewestFirst[0]!.score;
  const previousScore = pointsNewestFirst.length > 1 ? pointsNewestFirst[1]!.score : null;
  const deltaScore = previousScore != null ? latestScore - previousScore : null;

  let trendDirection: GrowthTrendDirection = "stable";
  if (deltaScore != null) {
    if (deltaScore > 0) trendDirection = "up";
    else if (deltaScore < 0) trendDirection = "down";
  }

  return { latestScore, previousScore, deltaScore, trendDirection };
}

/** 세션 목록 → 타임라인 포인트 (최신순) */
export function buildGrowthTimelinePointsFromSessions(
  sessions: PlayerGrowthSessionDoc[]
): GrowthTimelinePoint[] {
  return sessions
    .map(sessionToTimelinePoint)
    .filter((p): p is GrowthTimelinePoint => p != null);
}

/**
 * Sprint D-4.2-a — playerGrowthHistory 최근 N회 성장 타임라인
 * Firestore: playerId == · generatedAt DESC · limit
 */
export async function getPlayerGrowthTimeline(
  teamId: string,
  playerId: string,
  limit = 5
): Promise<PlayerGrowthTimeline> {
  const sessions = await listPlayerGrowthSessionsByPlayerId(teamId, playerId.trim(), limit);
  const pointsNewestFirst = buildGrowthTimelinePointsFromSessions(sessions);
  const summary = computeGrowthTimelineSummary(pointsNewestFirst);
  const points = [...pointsNewestFirst].reverse();

  return {
    teamId,
    playerId: playerId.trim(),
    points,
    count: points.length,
    ...summary,
  };
}
