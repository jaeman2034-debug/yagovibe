/**
 * VOC-012 — current match FII vs previous ≤3 matches mean (Coach)
 */

import {
  findPlayerFiiEntry,
  resolvePlayerIdentity,
} from "./playerIdentityResolver";
import type { ResolvedPlayerIdentity } from "./playerIntelligenceTypes";
import type { PlayerFii } from "./visionTypes";

export const MATCH_FLOW_TREND_MIN_N = 2 as const;
export const MATCH_FLOW_TREND_MAX_K = 3 as const;

export const MATCH_FLOW_TREND_HEADLINE = "최근 경기 흐름 비교" as const;
export const MATCH_FLOW_TREND_COPY_N3 = "최근 3경기 평균과 비교" as const;
export const MATCH_FLOW_TREND_COPY_N2 = "최근 2경기 평균과 비교" as const;

export type MatchFlowTrendWindowCopy =
  | typeof MATCH_FLOW_TREND_COPY_N3
  | typeof MATCH_FLOW_TREND_COPY_N2;

export type MatchFlowPlayerTrend = {
  n: number;
  minN: typeof MATCH_FLOW_TREND_MIN_N;
  maxK: typeof MATCH_FLOW_TREND_MAX_K;
  visible: true;
  metric: "fii";
  currentFii: number;
  previousMean: number;
  delta: number;
  previousMatchIds: string[];
  playerId?: string;
  trackId?: string;
  name?: string;
};

export type MatchFlowTrendPayload = {
  headlineCopy: typeof MATCH_FLOW_TREND_HEADLINE;
  windowCopy: MatchFlowTrendWindowCopy;
  windowN: 2 | 3;
  previousMatchIds: string[];
  byPlayer: Record<string, MatchFlowPlayerTrend>;
};

export type PreviousMatchPlayerFii = {
  matchId: string;
  playerFii: PlayerFii[];
  completedAtMs: number;
};

function isValidFii(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function matchFlowTrendWindowCopy(windowN: 2 | 3): MatchFlowTrendWindowCopy {
  return windowN === 3 ? MATCH_FLOW_TREND_COPY_N3 : MATCH_FLOW_TREND_COPY_N2;
}

export function playerTrendKey(identity: {
  playerId?: string;
  trackId?: string;
}): string | null {
  const playerId = identity.playerId?.trim();
  if (playerId) return `pid:${playerId}`;
  const trackId = identity.trackId?.trim();
  if (trackId) return `tid:${trackId}`;
  return null;
}

/**
 * One player: current FII vs mean of previous matches (max K) where player has FII.
 * Returns null when previous valid sample n < minN.
 */
export function buildMatchFlowTrendForPlayer(input: {
  currentMatchId: string;
  currentPlayerFii: PlayerFii[];
  previousMatches: PreviousMatchPlayerFii[];
  identity: ResolvedPlayerIdentity;
  name?: string;
}): MatchFlowPlayerTrend | null {
  const currentMatchId = input.currentMatchId.trim();
  if (!currentMatchId) return null;

  const currentEntry = findPlayerFiiEntry(input.currentPlayerFii, input.identity);
  if (!currentEntry || !isValidFii(currentEntry.fii)) return null;

  const previous = input.previousMatches
    .filter((m) => m.matchId.trim() && m.matchId.trim() !== currentMatchId)
    .slice(0, MATCH_FLOW_TREND_MAX_K);

  const samples: { matchId: string; fii: number }[] = [];
  for (const m of previous) {
    const entry = findPlayerFiiEntry(m.playerFii, input.identity);
    if (entry && isValidFii(entry.fii)) {
      samples.push({ matchId: m.matchId.trim(), fii: entry.fii });
    }
  }

  const n = samples.length;
  if (n < MATCH_FLOW_TREND_MIN_N) return null;

  const previousMean = round1(samples.reduce((s, x) => s + x.fii, 0) / n);
  const currentFii = currentEntry.fii;
  const delta = round1(currentFii - previousMean);

  return {
    n,
    minN: MATCH_FLOW_TREND_MIN_N,
    maxK: MATCH_FLOW_TREND_MAX_K,
    visible: true,
    metric: "fii",
    currentFii,
    previousMean,
    delta,
    previousMatchIds: samples.map((s) => s.matchId),
    playerId: input.identity.playerId || currentEntry.playerId,
    trackId: input.identity.trackId || currentEntry.trackId,
    name: input.name ?? currentEntry.name,
  };
}

/**
 * Team payload: requires ≥2 previous matches with analysis.
 * byPlayer only includes players with n ≥ 2.
 * Returns null when window too small or no visible players.
 */
export function buildMatchFlowTrendPayload(input: {
  currentMatchId: string;
  currentPlayerFii: PlayerFii[];
  previousMatches: PreviousMatchPlayerFii[];
  ranking: Array<{
    name: string;
    fii: number;
    trackId?: string;
    playerId?: string;
  }>;
}): MatchFlowTrendPayload | null {
  const currentMatchId = input.currentMatchId.trim();
  if (!currentMatchId) return null;

  const previous = input.previousMatches
    .filter((m) => m.matchId.trim() && m.matchId.trim() !== currentMatchId)
    .slice(0, MATCH_FLOW_TREND_MAX_K);

  if (previous.length < MATCH_FLOW_TREND_MIN_N) return null;

  const windowN = (previous.length >= 3 ? 3 : 2) as 2 | 3;
  const previousMatchIds = previous.map((m) => m.matchId.trim());
  const byPlayer: Record<string, MatchFlowPlayerTrend> = {};

  for (const row of input.ranking) {
    const identity = resolvePlayerIdentity({
      teamId: "_",
      playerId: row.playerId?.trim() || row.trackId?.trim() || "",
      trackId: row.trackId,
    });
    if (!identity.playerId && !identity.trackId) continue;

    const trend = buildMatchFlowTrendForPlayer({
      currentMatchId,
      currentPlayerFii: input.currentPlayerFii,
      previousMatches: previous,
      identity,
      name: row.name,
    });
    if (!trend) continue;

    // Ranking row FII is the surface current value for this match
    const currentFii = isValidFii(row.fii) ? row.fii : trend.currentFii;
    const delta = round1(currentFii - trend.previousMean);
    const normalized: MatchFlowPlayerTrend = {
      ...trend,
      currentFii,
      delta,
      playerId: row.playerId?.trim() || trend.playerId,
      trackId: row.trackId?.trim() || trend.trackId,
      name: row.name,
    };

    const keys = [
      playerTrendKey({ playerId: normalized.playerId, trackId: normalized.trackId }),
      playerTrendKey({ playerId: normalized.trackId }),
      playerTrendKey({ trackId: normalized.trackId }),
      playerTrendKey({ playerId: normalized.playerId }),
    ].filter(Boolean) as string[];

    for (const key of keys) {
      byPlayer[key] = normalized;
    }
  }

  if (Object.keys(byPlayer).length === 0) return null;

  return {
    headlineCopy: MATCH_FLOW_TREND_HEADLINE,
    windowCopy: matchFlowTrendWindowCopy(windowN),
    windowN,
    previousMatchIds,
    byPlayer,
  };
}

export function formatMatchFlowDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function formatMatchFlowDisplayLine(trend: MatchFlowPlayerTrend): string {
  return `현재 FII ${trend.currentFii} · 최근 ${trend.n}경기 평균 ${trend.previousMean} · ${formatMatchFlowDelta(trend.delta)}`;
}
