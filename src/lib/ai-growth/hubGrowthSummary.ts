import type { GrowthScoreDelta } from "@/lib/ai-growth/growthScore";
import {
  compareGrowthScoreToHistory,
  extractScoreHistoryFromSessions,
  type GrowthScoreSnapshot,
} from "@/lib/ai-growth/growthScore";

export type HubGrowthSummarySnapshot = {
  currentOverall: number;
  previousOverall: number;
  delta: GrowthScoreDelta;
  consecutiveGrowthSessions: number;
};

/** Hub — 저장된 세션만으로 최신 2회 비교 (Step 5 라이브 점수 미사용) */
export function buildHubGrowthSummaryFromSessions(
  sessions: Array<{ generatedAt: number; metrics: { growthScore?: GrowthScoreSnapshot } }>
): HubGrowthSummarySnapshot | null {
  const pool = extractScoreHistoryFromSessions(sessions);
  if (pool.length < 2) return null;

  const sorted = [...pool].sort((a, b) => b.generatedAt - a.generatedAt);
  const currentOverall = sorted[0]!.overall;
  const delta = compareGrowthScoreToHistory(currentOverall, sorted.slice(1));
  if (delta.previousOverall == null || delta.delta == null) return null;

  let consecutiveGrowthSessions = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i]!.overall > sorted[i + 1]!.overall) {
      consecutiveGrowthSessions += 1;
    } else {
      break;
    }
  }

  return {
    currentOverall,
    previousOverall: delta.previousOverall,
    delta,
    consecutiveGrowthSessions,
  };
}
