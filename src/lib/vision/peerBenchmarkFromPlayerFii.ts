/**
 * VOC-011 — peer (team · ageGroup) FII average from same-match playerFii
 */

import {
  findPlayerFiiEntry,
  resolvePlayerIdentity,
} from "./playerIdentityResolver";
import type { ResolvedPlayerIdentity } from "./playerIntelligenceTypes";
import type { PlayerFii } from "./visionTypes";

export const PEER_BENCHMARK_MIN_N = 5 as const;

export const PEER_BENCHMARK_COPY_PRIMARY = "같은 팀·연령 선수 평균과 비교" as const;
export const PEER_BENCHMARK_COPY_FALLBACK = "팀 평균과 비교" as const;

export type PeerBenchmarkPayload = {
  cohortKey: string;
  ageGroup: string | null;
  matchId: string;
  n: number;
  minN: typeof PEER_BENCHMARK_MIN_N;
  visible: true;
  metric: "fii";
  childValue: number | null;
  peerMean: number;
  delta: number | null;
  headlineCopy: typeof PEER_BENCHMARK_COPY_PRIMARY | typeof PEER_BENCHMARK_COPY_FALLBACK;
};

function normalizeAgeGroup(ageGroup: string | null | undefined): string | null {
  const v = ageGroup?.trim();
  return v || null;
}

function isValidFii(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type BuildPeerBenchmarkInput = {
  teamId: string;
  ageGroup?: string | null;
  matchId: string;
  playerFii: PlayerFii[];
  identity: ResolvedPlayerIdentity;
};

/**
 * Returns null when n < minN (미노출). Does not invent nationwide/league averages.
 */
export function buildPeerBenchmarkFromPlayerFii(
  input: BuildPeerBenchmarkInput
): PeerBenchmarkPayload | null {
  const teamId = input.teamId.trim();
  const matchId = input.matchId.trim();
  if (!teamId || !matchId) return null;

  const ageGroup = normalizeAgeGroup(input.ageGroup);
  const valid = input.playerFii.filter((e) => isValidFii(e.fii));
  const n = valid.length;
  if (n < PEER_BENCHMARK_MIN_N) return null;

  const peerMean = round1(valid.reduce((sum, e) => sum + e.fii, 0) / n);
  const childEntry = findPlayerFiiEntry(input.playerFii, input.identity);
  const childValue = childEntry && isValidFii(childEntry.fii) ? childEntry.fii : null;
  const delta = childValue != null ? round1(childValue - peerMean) : null;

  return {
    cohortKey: `${teamId}:${ageGroup ?? "team"}`,
    ageGroup,
    matchId,
    n,
    minN: PEER_BENCHMARK_MIN_N,
    visible: true,
    metric: "fii",
    childValue,
    peerMean,
    delta,
    headlineCopy: ageGroup ? PEER_BENCHMARK_COPY_PRIMARY : PEER_BENCHMARK_COPY_FALLBACK,
  };
}

/** Map fii_summary players → PlayerFii for findPlayerFiiEntry + mean */
export function fiiSummaryPlayersToPlayerFii(
  players: Array<{
    trackId: string;
    name?: string;
    fii: number;
    rank?: number;
    axes?: PlayerFii["axes"];
  }>
): PlayerFii[] {
  return players.map((p) => ({
    trackId: p.trackId,
    name: p.name,
    fii: p.fii,
    rank: p.rank,
    axes: p.axes,
  }));
}

export function buildPeerBenchmarkIdentity(input: {
  teamId: string;
  playerId: string;
  trackId?: string;
  uid?: string;
}): ResolvedPlayerIdentity {
  return resolvePlayerIdentity({
    teamId: input.teamId,
    playerId: input.playerId,
    trackId: input.trackId,
    uid: input.uid,
  });
}
