/**
 * 플레이 탭 공용 MVP — 팀·경기·로스터만 같으면 모든 클라이언트가 동일 결과를 본다.
 * 결정적 PRNG + simulateMatch 이벤트 + 출전·OVR 보정.
 */
import type { TeamGame, TeamGamePlayParticipationEntry } from "@/types/teamGame";
import type { PlayPlayerStatsDoc } from "@/utils/playerStats";
import {
  buildRivalRosterFromAwayPower,
  buildRosterLineupContext,
  calculatePlayerImpact,
  simulateMatch,
  type SimMatchEvent,
} from "@/lib/play/simulation";
import { impactMvpScore } from "@/lib/play/matchAwards";
import { buildLineupPickContextForTeam, normalizeQuarterMinutePlan } from "@/lib/play/teamGameParticipation";

export type PlayTabMvpBanner = {
  memberId: string;
  displayName: string;
  mainPosition: string;
  goals: number;
  shotSuccessPct: number;
  eventTouches: number;
  influenceRank: number;
  influenceDenominator: number;
  scoreModel: number;
};

export function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uniqHomePlayers(events: readonly SimMatchEvent[]): string[] {
  const s = new Set<string>();
  for (const e of events) {
    if (e.side === "home" && e.playerId?.trim()) s.add(e.playerId.trim());
  }
  return [...s];
}

function participationStrengthMinutes(entry?: { minutesPlayed?: number; quartersPlayed?: number }): number {
  const m = entry?.minutesPlayed ?? 0;
  const q = entry?.quartersPlayed ?? 0;
  if (m > 0) return Math.min(120, m);
  if (q > 0) return Math.min(120, q * 15);
  return 0;
}

/** 플레이 탭 MVP · 시뮬 모달과 동일 시드로 매치 결과를 재현할 때 사용 */
export function deterministicPlaySimKnobs(
  teamId: string,
  matchId: string,
  roster: readonly PlayPlayerStatsDoc[]
): { rng: () => number; awayPower: number } | null {
  const tid = teamId.trim();
  const mid = matchId.trim();
  if (!tid || !mid || roster.length === 0) return null;
  const rosterKey = [...roster.map((p) => p.memberId)].sort().join("|");
  const seedBase = hashStringToSeed(`yago.playTab.mvp.v1:${tid}:${mid}:${rosterKey}`);
  return {
    rng: mulberry32(seedBase),
    awayPower: 280 + (seedBase % 160),
  };
}

/**
 * 동일 이벤트 로그에서 플레이 탭 공식 MVP 산출 (출전·OVR 보정 포함).
 * 시뮬 모달 시상과 동일 기준으로 맞출 때 사용.
 */
export function computeEnhancedPlayTabMvpFromEvents(
  events: readonly SimMatchEvent[],
  roster: readonly PlayPlayerStatsDoc[],
  teamId: string,
  linkedGame: TeamGame | null
): PlayTabMvpBanner | null {
  const tid = teamId.trim();
  if (!tid || roster.length === 0) return null;

  const entries = linkedGame?.playParticipation?.byTeam?.[tid]?.entries ?? [];
  const partMap = new Map(entries.map((e) => [e.memberId, e]));

  const strengths = roster.map((p) => ({
    memberId: p.memberId,
    strength: participationStrengthMinutes(partMap.get(p.memberId)),
  }));
  const maxPart = Math.max(1, ...strengths.map((s) => s.strength));
  const strengthRank = (memberId: string): { rank: number; denom: number } => {
    const sorted = [...strengths].sort((a, b) => b.strength - a.strength);
    const idx = sorted.findIndex((s) => s.memberId === memberId);
    const rank = idx >= 0 ? idx + 1 : sorted.length;
    return { rank, denom: sorted.length };
  };

  const ids = uniqHomePlayers(events);
  if (ids.length === 0) return null;

  const scores: number[] = [];
  const rows: PlayTabMvpBanner[] = [];

  for (const playerId of ids) {
    const imp = calculatePlayerImpact(playerId, events);
    const player = roster.find((p) => p.memberId === playerId);
    if (!player) continue;

    const base = impactMvpScore(imp);
    const touches =
      imp.passOk +
      imp.passFail +
      imp.dribbleOk +
      imp.dribbleFail +
      imp.shots +
      imp.blocks +
      imp.saves;

    const relPart = (partMap.get(playerId) ? participationStrengthMinutes(partMap.get(playerId)) : 0) / maxPart;
    const participationMult = 0.72 + 0.48 * relPart;

    const ovr = Math.max(18, Number(player.ovr) || 18);
    const ovrDampen = 1 / (1 + Math.max(0, ovr - 70) * 0.028);

    const finalScore = (base + touches * 0.38) * participationMult * ovrDampen;

    const shotTotal = imp.shots;
    const shotPct = shotTotal > 0 ? Math.round((imp.shotsOnTarget / shotTotal) * 100) : 0;

    const { rank: influenceRank, denom: influenceDenominator } = strengthRank(playerId);

    scores.push(finalScore);
    rows.push({
      memberId: playerId,
      displayName: imp.displayName || player.displayName,
      mainPosition: player.mainPosition ?? "MF",
      goals: imp.goals,
      shotSuccessPct: shotPct,
      eventTouches: touches,
      influenceRank,
      influenceDenominator,
      scoreModel: Math.round(finalScore * 10) / 10,
    });
  }

  if (rows.length === 0) return null;

  const maxS = Math.max(...scores);
  const tied = rows.filter((_, i) => Math.abs(scores[i]! - maxS) < 1e-6);
  tied.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.eventTouches !== a.eventTouches) return b.eventTouches - a.eventTouches;
    return a.memberId.localeCompare(b.memberId);
  });
  return tied[0] ?? null;
}

export type PlayTabMatchSnapshot = {
  mvp: PlayTabMvpBanner | null;
  events: SimMatchEvent[];
};

function buildParticipationContext(
  roster: readonly PlayPlayerStatsDoc[],
  teamId: string,
  linkedGame: TeamGame | null
): {
  partMap: Map<string, TeamGamePlayParticipationEntry | undefined>;
  maxPart: number;
  strengthRank: (memberId: string) => { rank: number; denom: number };
} {
  const tid = teamId.trim();
  const entries = linkedGame?.playParticipation?.byTeam?.[tid]?.entries ?? [];
  const partMap = new Map<string, TeamGamePlayParticipationEntry | undefined>(
    entries.map((e) => [e.memberId, e])
  );

  const strengths = roster.map((p) => ({
    memberId: p.memberId,
    strength: participationStrengthMinutes(partMap.get(p.memberId)),
  }));
  const maxPart = Math.max(1, ...strengths.map((s) => s.strength));
  const strengthRank = (memberId: string): { rank: number; denom: number } => {
    const sorted = [...strengths].sort((a, b) => b.strength - a.strength);
    const idx = sorted.findIndex((s) => s.memberId === memberId);
    const rank = idx >= 0 ? idx + 1 : sorted.length;
    return { rank, denom: sorted.length };
  };

  return { partMap, maxPart, strengthRank };
}

/** 단일 선수의 플레이 탭 지표 (나 vs MVP 비교용) */
export function computePlayTabPlayerMetrics(
  memberId: string,
  events: readonly SimMatchEvent[],
  roster: readonly PlayPlayerStatsDoc[],
  teamId: string,
  linkedGame: TeamGame | null
): PlayTabMvpBanner | null {
  const tid = teamId.trim();
  const mid = typeof memberId === "string" ? memberId.trim() : "";
  if (!tid || !mid || roster.length === 0) return null;

  const player = roster.find((p) => p.memberId === mid);
  if (!player) return null;

  const { partMap, maxPart, strengthRank } = buildParticipationContext(roster, tid, linkedGame);

  const imp = calculatePlayerImpact(mid, events);
  const base = impactMvpScore(imp);
  const touches =
    imp.passOk +
    imp.passFail +
    imp.dribbleOk +
    imp.dribbleFail +
    imp.shots +
    imp.blocks +
    imp.saves;

  const relPart = (partMap.get(mid) ? participationStrengthMinutes(partMap.get(mid)) : 0) / maxPart;
  const participationMult = 0.72 + 0.48 * relPart;

  const ovr = Math.max(18, Number(player.ovr) || 18);
  const ovrDampen = 1 / (1 + Math.max(0, ovr - 70) * 0.028);

  const finalScore = (base + touches * 0.38) * participationMult * ovrDampen;

  const shotTotal = imp.shots;
  const shotPct = shotTotal > 0 ? Math.round((imp.shotsOnTarget / shotTotal) * 100) : 0;

  const { rank: influenceRank, denom: influenceDenominator } = strengthRank(mid);

  return {
    memberId: mid,
    displayName: imp.displayName || player.displayName,
    mainPosition: player.mainPosition ?? "MF",
    goals: imp.goals,
    shotSuccessPct: shotPct,
    eventTouches: touches,
    influenceRank,
    influenceDenominator,
    scoreModel: Math.round(finalScore * 10) / 10,
  };
}

/**
 * 경기 스냅샷 (이벤트 + MVP) — 탭·저장소·MOMENT 재생에서 공통 사용
 */
export function computeCanonicalPlayTabSnapshot(
  teamId: string,
  matchId: string,
  roster: readonly PlayPlayerStatsDoc[],
  linkedGame: TeamGame | null,
  highlightMemberId?: string | null
): PlayTabMatchSnapshot {
  const tid = teamId.trim();
  const mid = matchId.trim();
  if (!tid || !mid || roster.length === 0) return { mvp: null, events: [] };

  const knobs = deterministicPlaySimKnobs(tid, mid, roster);
  if (!knobs) return { mvp: null, events: [] };

  const { rng, awayPower } = knobs;

  const rivals = buildRivalRosterFromAwayPower("rival-ai", roster, awayPower);
  if (rivals.length === 0) return { mvp: null, events: [] };

  const qPlan = normalizeQuarterMinutePlan(linkedGame?.playParticipation?.quarterMinutePlan);
  const minutesFromSchedule = Math.max(42, Math.min(96, qPlan.reduce((a, b) => a + b, 0) || 60));

  const homeLineupPick = buildLineupPickContextForTeam(tid, linkedGame, roster, minutesFromSchedule);

  const sim = simulateMatch({
    homeRoster: roster,
    awayRoster: rivals,
    homeLineupPick,
    awayLineupPick: buildRosterLineupContext(),
    minutes: minutesFromSchedule,
    quarterMinutePlan: linkedGame?.playParticipation?.quarterMinutePlan,
    homeTeamBias: 0.04,
    rng,
    highlightMemberId: highlightMemberId ?? null,
  });

  const mvp = computeEnhancedPlayTabMvpFromEvents(sim.events, roster, tid, linkedGame);
  return { mvp, events: sim.events };
}

/**
 * 경기당 공식 MVP (시뮬 이벤트 스냅샷 기준).
 * - 시드: teamId + matchId + 정렬된 memberId (카드 스냅샷이 같으면 동일)
 * - 상대 전력·RNG 고정 → 이벤트 재현
 */
export function computeCanonicalPlayTabMvp(
  teamId: string,
  matchId: string,
  roster: readonly PlayPlayerStatsDoc[],
  linkedGame: TeamGame | null,
  /** 시뮬 모달과 동일한 하이라이트 선수 — 이벤트 스트림 일치 */
  highlightMemberId?: string | null
): PlayTabMvpBanner | null {
  return computeCanonicalPlayTabSnapshot(teamId, matchId, roster, linkedGame, highlightMemberId).mvp;
}

