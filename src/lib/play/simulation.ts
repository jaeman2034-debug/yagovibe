/**
 * 플레이 탭 이벤트 기반 라이트 매치 시뮬 (동기, 로컬 RNG)
 * — playerStats 스키마 변경 없음 · team_games.playParticipation(선택) 반영
 */
import type { LineupPickContext, LineupSimSource } from "@/lib/play/teamGameParticipation";
import {
  highlightUsedActualParticipation,
  minuteToQuarter,
  normalizeQuarterMinutePlan,
  resolveActorPosition,
  scaledQuarterEnds,
} from "@/lib/play/teamGameParticipation";
import type { PlayPlayerStatsDoc, PlayRecentGrowth, PlaySixStats } from "@/utils/playerStats";
import type { PlayMainPosition } from "@/utils/playerStats";
import {
  PLAY_STAT_KEYS,
  calculateOVR,
  normalizePlaySix,
  normalizeStat,
} from "@/utils/playerStats";

export type SimEventType = "pass" | "dribble" | "shot" | "block" | "save";

export type SimTeamSide = "home" | "away";

export type SimLineupSourceTag = "actual" | "roster" | "fallback";

export type SimMatchEvent = {
  minute: number;
  type: SimEventType;
  side: SimTeamSide;
  playerId: string;
  displayName: string;
  success: boolean;
  goal?: boolean;
  blocked?: boolean;
  /** 쿼터 (1-based) */
  quarter?: number;
  /** 이벤트가 나온 팀 기준 출전 데이터 소스 */
  lineupSource?: SimLineupSourceTag;
  /** 스냅샷 포지션 또는 카드 포지션 */
  position?: string;
};

export type SimulateMatchArgs = {
  homeRoster: readonly PlayPlayerStatsDoc[];
  awayRoster: readonly PlayPlayerStatsDoc[];
  /** 홈 팀 출전 가중 (없으면 로스터 균등 취급) */
  homeLineupPick?: LineupPickContext;
  awayLineupPick?: LineupPickContext;
  /** 시뮬 총 분 (기본 60) */
  minutes?: number;
  /** 쿼터 길이(분) 배열 — 없으면 15×4 */
  quarterMinutePlan?: number[];
  homeTeamBias?: number;
  rng?: () => number;
  highlightMemberId?: string | null;
};

export type SimulateMatchMeta = {
  homeLineupSource: SimLineupSourceTag;
  awayLineupSource: SimLineupSourceTag;
  quarterMinutesNormalized: number[];
  highlightHadActualWeights: boolean;
  totalMinutes: number;
};

export type SimulateMatchResult = {
  scoreHome: number;
  scoreAway: number;
  events: SimMatchEvent[];
  meta: SimulateMatchMeta;
};

export type PlayerSimImpact = {
  memberId: string;
  displayName: string;
  passOk: number;
  passFail: number;
  dribbleOk: number;
  dribbleFail: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  blocks: number;
  saves: number;
};

export type SimGrowthRateCompare = {
  label: string;
  beforePct: number;
  afterPct: number;
};

type AttackKind = "pass" | "dribble" | "shot";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function normalizeAttackMix(m: { pass: number; dribble: number; shot: number }): Record<AttackKind, number> {
  const t = m.pass + m.dribble + m.shot || 1;
  return { pass: m.pass / t, dribble: m.dribble / t, shot: m.shot / t };
}

/** 포지션별 공격 이벤트 편향 */
function attackMixForRoleLabel(posStr: string | undefined, main: PlayMainPosition | undefined): Record<AttackKind, number> {
  const raw = (posStr || main || "MF").toString().toUpperCase();
  if (raw.includes("FW") || raw.includes("공격")) {
    return normalizeAttackMix({ pass: 0.38, dribble: 0.22, shot: 0.4 });
  }
  if (raw.includes("DF") || raw.includes("수비")) {
    return normalizeAttackMix({ pass: 0.52, dribble: 0.24, shot: 0.12 });
  }
  if (raw.includes("GK") || raw.includes("키퍼")) {
    return normalizeAttackMix({ pass: 0.62, dribble: 0.1, shot: 0.06 });
  }
  return normalizeAttackMix({ pass: 0.5, dribble: 0.28, shot: 0.22 });
}

function pickAttackKind(rng: () => number, mix: Record<AttackKind, number>): AttackKind {
  const r = rng();
  if (r < mix.pass) return "pass";
  if (r < mix.pass + mix.dribble) return "dribble";
  return "shot";
}

/** 스탯(1~5) → 라이트 시뮬에서 쓰는 행동 확률 테이블 */
export function deriveActionRates(stats: PlaySixStats) {
  const s = normalizePlaySix(stats);
  return {
    passSuccess: clamp01(0.38 + s.pass * 0.09),
    shotQuality: clamp01(0.1 + s.shoot * 0.072),
    goalIfOnTarget: clamp01(0.08 + s.shoot * 0.03),
    dribbleSuccess: clamp01(0.3 + (s.speed * 0.046 + s.stamina * 0.026)),
    defendBlock: clamp01(0.17 + s.defense * 0.074),
    gkSaveBoost: clamp01(0.12 + (s.defense * 0.05 + s.speed * 0.018)),
  };
}

export function buildSimGrowthComparison(player: PlayPlayerStatsDoc): SimGrowthRateCompare[] {
  const prev = subtractRecentGrowth(player.stats, player.recentGrowth);
  const now = normalizePlaySix(player.stats);
  const before = deriveActionRates(prev);
  const after = deriveActionRates(now);
  return [
    {
      label: "패스 성공(모델)",
      beforePct: Math.round(before.passSuccess * 100),
      afterPct: Math.round(after.passSuccess * 100),
    },
    {
      label: "슛 판정(모델)",
      beforePct: Math.round(before.shotQuality * 100),
      afterPct: Math.round(after.shotQuality * 100),
    },
  ];
}

function subtractRecentGrowth(current: PlaySixStats, growth: PlayRecentGrowth): PlaySixStats {
  const base: PlaySixStats = { ...normalizePlaySix(current) };
  for (const k of PLAY_STAT_KEYS) {
    const g = growth[k] ?? 0;
    base[k] = normalizeStat(Math.round(Number(base[k] ?? 3) - g));
  }
  return normalizePlaySix(base);
}

function sumTeamOvr(roster: readonly PlayPlayerStatsDoc[]): number {
  if (roster.length === 0) return 120;
  return roster.reduce((a, p) => a + Math.max(18, Number(p.ovr) || 0), 0);
}

function pickLineupForSide(side: SimTeamSide, homeCtx: LineupPickContext, awayCtx: LineupPickContext): LineupPickContext {
  return side === "home" ? homeCtx : awayCtx;
}

/** 출전 배율 + OVR 블렌드 (OVR 단독 독점 방지) */
function actorPickWeight(
  p: PlayPlayerStatsDoc,
  kind: AttackKind,
  lineup: LineupPickContext
): number {
  const ovr = Math.max(20, Number(p.ovr) || 20);
  const exp =
    kind === "shot"
      ? 1.06
      : kind === "dribble"
        ? 0.98
        : 0.92;
  const ovrPow = Math.pow(ovr / 24.5, exp);
  let pw = 1;
  if (lineup.lineupSource === "actual" && lineup.weightByMember.size > 0) {
    pw = lineup.weightByMember.get(p.memberId)?.w ?? 0.09;
  } else if (lineup.lineupSource === "fallback") {
    pw = 0.88;
  } else {
    pw = 1;
  }
  return Math.max(0.048, (0.24 + pw * 0.82) * (0.45 + ovrPow * 0.7));
}

function weightedPickAttackActor(
  roster: readonly PlayPlayerStatsDoc[],
  rng: () => number,
  kind: AttackKind,
  lineup: LineupPickContext
): PlayPlayerStatsDoc | null {
  if (!roster.length) return null;
  const outfield = roster.filter((p) => p.mainPosition !== "GK");
  const pool =
    outfield.length === 0
      ? roster
      : kind === "pass" || rng() < 0.86
        ? outfield
        : roster;

  let wsum = 0;
  const w = pool.map((p) => {
    wsum += actorPickWeight(p, kind, lineup);
    return wsum;
  });
  const r = rng() * wsum;
  const idx = w.findIndex((x) => r <= x);
  return pool[Math.max(0, idx)] ?? pool[0];
}

function snapshotForActor(lineup: LineupPickContext, memberId: string): string | undefined {
  return lineup.weightByMember.get(memberId)?.snapshotPosition;
}

function pickDefender(
  roster: readonly PlayPlayerStatsDoc[],
  rng: () => number,
  lineup: LineupPickContext
): PlayPlayerStatsDoc | null {
  const gks = roster.filter((p) => p.mainPosition === "GK");
  const dfs = roster.filter((p) => p.mainPosition === "DF");
  const mids = roster.filter((p) => p.mainPosition === "MF");
  let pool =
    dfs.length > 0
      ? dfs
      : gks.length > 0 && rng() < 0.42
        ? gks
        : mids.length > 0
          ? mids
          : roster;

  /** DF는 실제 출전 맵에서 가중 (수비 이벤트 다양화) */
  let wsum = 0;
  const w = pool.map((p) => {
    const base = 1 + p.stats.defense * 1.35 + (p.mainPosition === "GK" ? 2.4 : p.mainPosition === "DF" ? 1.15 : 0);
    const boost = lineup.lineupSource === "actual" ? 0.55 + (lineup.weightByMember.get(p.memberId)?.w ?? 0.12) : 1;
    wsum += base * boost;
    return wsum;
  });
  const r = rng() * wsum;
  const idx = w.findIndex((x) => r <= x);
  return pool[Math.max(0, idx)] ?? pool[0] ?? roster[0] ?? null;
}

function pickGk(roster: readonly PlayPlayerStatsDoc[]): PlayPlayerStatsDoc | null {
  return roster.find((p) => p.mainPosition === "GK") ?? roster[0] ?? null;
}

function toTag(src: LineupSimSource): SimLineupSourceTag {
  return src === "actual" ? "actual" : src === "fallback" ? "fallback" : "roster";
}

export function buildRosterLineupContext(): LineupPickContext {
  return { lineupSource: "roster", weightByMember: new Map() };
}

/** 홈 라인업 기준 전력 숫자(기존 teamPlaySimulation 과 비슷한 스케일)에 맞춘 라이벌 카드 빌더 */
export function buildRivalRosterFromAwayPower(
  rivalTeamKey: string,
  homeRoster: readonly PlayPlayerStatsDoc[],
  awayPower: number
): PlayPlayerStatsDoc[] {
  if (homeRoster.length === 0) return [];
  const homeSum = sumTeamOvr(homeRoster);
  const ratio = clamp01(awayPower / (Math.max(homeSum, 80) + 1e-6));
  const scale = clamp01(0.78 + ratio * 0.36);

  const labels = ["카이저", "리오", "베링", "드나", "로프", "샨", "네오", "하랄", "쿠엔"];
  return homeRoster.map((src, idx) => {
    const jitter = (((idx * 7919 + 17) % 13) / 130) - 0.05;
    const local = clamp01(scale + jitter * 0.12);
    const next: PlaySixStats = normalizePlaySix(
      PLAY_STAT_KEYS.reduce((acc, k) => {
        acc[k] = normalizeStat(Math.round(src.stats[k] * local));
        return acc;
      }, {} as PlaySixStats)
    );
    const ovr = calculateOVR(next);
    const label = `${labels[idx % labels.length]}·${idx + 1}`;
    return {
      teamId: rivalTeamKey,
      memberId: `rival-${rivalTeamKey}-${idx + 1}`,
      displayName: label,
      number: `${10 + (idx % 80)}`,
      positions: src.positions?.length ? [...src.positions] : [],
      mainPosition: src.mainPosition,
      avatarType: src.avatarType,
      stats: next,
      ovr,
      level: src.level ?? 1,
      exp: src.exp ?? 0,
      badges: [],
      recentGrowth: {},
      userId: undefined,
    } satisfies PlayPlayerStatsDoc;
  });
}

export function simulateMatch(args: SimulateMatchArgs): SimulateMatchResult {
  const {
    homeRoster,
    awayRoster,
    homeLineupPick = buildRosterLineupContext(),
    awayLineupPick = buildRosterLineupContext(),
    minutes = 60,
    quarterMinutePlan,
    homeTeamBias = 0.04,
    rng = Math.random,
    highlightMemberId = null,
  } = args;

  let scoreHome = 0;
  let scoreAway = 0;
  const events: SimMatchEvent[] = [];

  const totalMin = Math.max(24, Math.min(minutes, 96));
  const quarterPlan = normalizeQuarterMinutePlan(quarterMinutePlan);
  const quarterEndMarks = scaledQuarterEnds(quarterPlan, totalMin);

  const meta: SimulateMatchMeta = {
    homeLineupSource: toTag(homeLineupPick.lineupSource),
    awayLineupSource: toTag(awayLineupPick.lineupSource),
    quarterMinutesNormalized: quarterPlan,
    highlightHadActualWeights: highlightUsedActualParticipation(homeLineupPick, highlightMemberId),
    totalMinutes: totalMin,
  };

  if (!homeRoster.length || !awayRoster.length) {
    return { scoreHome: 0, scoreAway: 0, events: [], meta };
  }

  const hSum = sumTeamOvr(homeRoster);
  const aSum = sumTeamOvr(awayRoster);
  let homeMomentum = clamp01(hSum / (hSum + aSum + 1e-6));

  for (let minute = 1; minute <= totalMin; minute++) {
    const quarter = minuteToQuarter(minute, quarterEndMarks);
    const homeRoll = rng();
    const homePress =
      avgStat(homeRoster, "stamina") + avgStat(homeRoster, "pass") * 0.85;
    const awayPress =
      avgStat(awayRoster, "stamina") + avgStat(awayRoster, "pass") * 0.85;
    const pressRatio = clamp01(homePress / (homePress + awayPress + 1e-6));

    homeMomentum = clamp01(homeMomentum * 0.97 + pressRatio * 0.06);
    const pHomeAtk = clamp01(homeMomentum + homeTeamBias * 0.15 + pressRatio * 0.06);
    const side: SimTeamSide = homeRoll < pHomeAtk ? "home" : "away";

    const atkR = side === "home" ? homeRoster : awayRoster;
    const defR = side === "home" ? awayRoster : homeRoster;
    const atkLineup = pickLineupForSide(side, homeLineupPick, awayLineupPick);
    const defLineup = side === "home" ? awayLineupPick : homeLineupPick;

    const atkLineSrc = toTag(atkLineup.lineupSource);
    const defLineSrc = toTag(defLineup.lineupSource);

    const ghostActor = weightedPickAttackActor(atkR, rng, "pass", atkLineup);
    const posLabel = ghostActor
      ? resolveActorPosition(ghostActor, snapshotForActor(atkLineup, ghostActor.memberId))
      : "MF";
    const mix = attackMixForRoleLabel(posLabel, ghostActor?.mainPosition);
    const type = pickAttackKind(rng, mix);

    const actor = weightedPickAttackActor(atkR, rng, type, atkLineup);
    if (!actor) continue;

    const actorPos = resolveActorPosition(actor, snapshotForActor(atkLineup, actor.memberId));
    const rates = deriveActionRates(actor.stats);

    if (type === "pass") {
      const success = rng() < rates.passSuccess * (side === "home" ? 1 + homeTeamBias : 1);
      events.push({
        minute,
        quarter,
        type,
        side,
        playerId: actor.memberId,
        displayName: actor.displayName,
        success,
        lineupSource: atkLineSrc,
        position: actorPos,
      });
      continue;
    }

    if (type === "dribble") {
      let success = rng() < rates.dribbleSuccess;
      const tackler = pickDefender(defR, rng, defLineup);
      if (tackler) {
        const tack = deriveActionRates(tackler.stats).defendBlock;
        const dfBoost = tackler.mainPosition === "DF" ? 1.14 : 1;
        if (rng() < tack * 0.52 * dfBoost) success = false;
      }
      events.push({
        minute,
        quarter,
        type,
        side,
        playerId: actor.memberId,
        displayName: actor.displayName,
        success,
        lineupSource: atkLineSrc,
        position: actorPos,
      });
      continue;
    }

    const defender = pickDefender(defR, rng, defLineup);
    const blockBase = defender ? deriveActionRates(defender.stats).defendBlock : 0.12;
    const dfFactor = defender?.mainPosition === "DF" ? 1.22 : defender?.mainPosition === "GK" ? 0.82 : 1;
    const blocked = rng() < blockBase * (0.44 + rng() * 0.08) * dfFactor;
    if (blocked && defender) {
      events.push({
        minute,
        quarter,
        type: "shot",
        side,
        playerId: actor.memberId,
        displayName: actor.displayName,
        success: false,
        blocked: true,
        lineupSource: atkLineSrc,
        position: actorPos,
      });
      events.push({
        minute,
        quarter,
        type: "block",
        side: side === "home" ? "away" : "home",
        playerId: defender.memberId,
        displayName: defender.displayName,
        success: true,
        lineupSource: defLineSrc,
        position: resolveActorPosition(defender, snapshotForActor(defLineup, defender.memberId)),
      });
      continue;
    }

    const onTarget = rng() < rates.shotQuality;
    if (!onTarget) {
      events.push({
        minute,
        quarter,
        type: "shot",
        side,
        playerId: actor.memberId,
        displayName: actor.displayName,
        success: false,
        lineupSource: atkLineSrc,
        position: actorPos,
      });
      continue;
    }

    let goalChance = rates.goalIfOnTarget;
    const gk = pickGk(defR);
    if (gk) {
      goalChance *= 1 - 0.78 * deriveActionRates(gk.stats).gkSaveBoost;
      goalChance = clamp01(goalChance * (0.94 + rng() * 0.06));
    }
    const goal = rng() < goalChance;
    if (goal) {
      if (side === "home") scoreHome += 1;
      else scoreAway += 1;
    } else if (gk && onTarget) {
      events.push({
        minute,
        quarter,
        type: "save",
        side: side === "home" ? "away" : "home",
        playerId: gk.memberId,
        displayName: gk.displayName,
        success: true,
        lineupSource: defLineSrc,
        position: "GK",
      });
    }

    events.push({
      minute,
      quarter,
      type: "shot",
      side,
      playerId: actor.memberId,
      displayName: actor.displayName,
      success: true,
      goal: goal || undefined,
      lineupSource: atkLineSrc,
      position: actorPos,
    });
  }

  return { scoreHome, scoreAway, events, meta };
}

function avgStat(roster: readonly PlayPlayerStatsDoc[], k: keyof PlaySixStats): number {
  if (!roster.length) return 3;
  const s = roster.reduce((acc, p) => acc + normalizeStat(p.stats[k] ?? 3), 0);
  return s / roster.length;
}

export function calculatePlayerImpact(playerId: string, events: readonly SimMatchEvent[]): PlayerSimImpact {
  const impacts: Omit<PlayerSimImpact, "memberId" | "displayName"> & { name: string } = {
    name: "",
    passOk: 0,
    passFail: 0,
    dribbleOk: 0,
    dribbleFail: 0,
    shots: 0,
    shotsOnTarget: 0,
    goals: 0,
    blocks: 0,
    saves: 0,
  };

  for (const e of events) {
    if (e.playerId !== playerId) continue;
    if (!impacts.name && e.displayName) impacts.name = e.displayName;
    switch (e.type) {
      case "pass":
        if (e.success) impacts.passOk += 1;
        else impacts.passFail += 1;
        break;
      case "dribble":
        if (e.success) impacts.dribbleOk += 1;
        else impacts.dribbleFail += 1;
        break;
      case "shot":
        impacts.shots += 1;
        if (e.blocked) break;
        if (e.success) {
          impacts.shotsOnTarget += 1;
          if (e.goal) impacts.goals += 1;
        }
        break;
      case "block":
        if (e.success) impacts.blocks += 1;
        break;
      case "save":
        if (e.success) impacts.saves += 1;
        break;
      default:
        break;
    }
  }

  return {
    memberId: playerId,
    displayName: impacts.name || "선수",
    passOk: impacts.passOk,
    passFail: impacts.passFail,
    dribbleOk: impacts.dribbleOk,
    dribbleFail: impacts.dribbleFail,
    shots: impacts.shots,
    shotsOnTarget: impacts.shotsOnTarget,
    goals: impacts.goals,
    blocks: impacts.blocks,
    saves: impacts.saves,
  };
}

export function buildPlayerEventLog(playerId: string, events: readonly SimMatchEvent[]): SimMatchEvent[] {
  return events.filter((e) => e.playerId === playerId);
}
