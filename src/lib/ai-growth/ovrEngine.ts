import type { GrowthScoreDimensionKey } from "@/lib/ai-growth/growthScore";
import { GROWTH_SCORE_WEIGHTS, type GrowthScoreSnapshot } from "@/lib/ai-growth/growthScore";
import type { DimensionDeltaRank } from "@/lib/ai-growth/growthReportDimensions";
import type { PlayerGrowthOvrDoc, SeasonOvrImpact } from "@/lib/ai-growth/playerGrowthOvrTypes";

export const OVR_STAT_WEIGHTS = GROWTH_SCORE_WEIGHTS;

export type OvrStats = {
  vision: number;
  pressure: number;
  recovery: number;
};

export const DEFAULT_OVR_STATS: OvrStats = {
  vision: 60,
  pressure: 60,
  recovery: 60,
};

export function clampOvrStat(value: number): number {
  return Math.min(99, Math.max(40, Math.round(value)));
}

export function computeOvrFromStats(stats: OvrStats): number {
  return clampOvrStat(
    stats.vision * OVR_STAT_WEIGHTS.SCAN +
      stats.pressure * OVR_STAT_WEIGHTS.PRESS_RESIST +
      stats.recovery * OVR_STAT_WEIGHTS.QUICK_RECOVERY
  );
}

const STAT_LABELS: Record<keyof OvrStats, { label: string; labelKo: string }> = {
  vision: { label: "Vision", labelKo: "시야·주변 확인" },
  pressure: { label: "Pressure", labelKo: "압박 저항" },
  recovery: { label: "Recovery", labelKo: "회복 속도" },
};

export function dimensionKeyToStatKey(key: GrowthScoreDimensionKey): keyof OvrStats {
  if (key === "SCAN") return "vision";
  if (key === "PRESS_RESIST") return "pressure";
  return "recovery";
}

/** Growth Score 축 변화량 → OVR 능력치 반영 (예: SCAN +30 → Vision 약 +4) */
export function growthDimensionDeltaToOvrStatDelta(growthScoreDelta: number): number {
  if (growthScoreDelta <= 0) return 0;
  return Math.max(1, Math.round(growthScoreDelta / 7));
}

export function statsFromGrowthSnapshot(snapshot: GrowthScoreSnapshot): OvrStats | null {
  const vision = snapshot.visionScan;
  const pressure = snapshot.pressureResistance;
  const recovery = snapshot.recoverySpeed;

  const weighted = [
    { value: vision, weight: OVR_STAT_WEIGHTS.SCAN },
    { value: pressure, weight: OVR_STAT_WEIGHTS.PRESS_RESIST },
    { value: recovery, weight: OVR_STAT_WEIGHTS.QUICK_RECOVERY },
  ].filter((e) => e.value !== null) as Array<{ value: number; weight: number }>;

  if (!weighted.length) return null;

  const totalWeight = weighted.reduce((s, e) => s + e.weight, 0);
  const blended = weighted.reduce((s, e) => s + e.value * (e.weight / totalWeight), 0);
  const fallback = clampOvrStat(blended);

  return {
    vision: clampOvrStat(vision ?? fallback),
    pressure: clampOvrStat(pressure ?? fallback),
    recovery: clampOvrStat(recovery ?? fallback),
  };
}

export function ovrBundleFromStats(stats: OvrStats): OvrStats & { ovr: number } {
  return { ...stats, ovr: computeOvrFromStats(stats) };
}

export function ovrBundleFromProfile(doc: PlayerGrowthOvrDoc): OvrStats & { ovr: number } {
  return {
    vision: doc.vision,
    pressure: doc.pressure,
    recovery: doc.recovery,
    ovr: doc.ovr,
  };
}

export function defaultOvrBundle(): OvrStats & { ovr: number } {
  return ovrBundleFromStats(DEFAULT_OVR_STATS);
}

export function applySeasonDimensionDeltas(
  current: OvrStats & { ovr: number },
  rankedDeltas: DimensionDeltaRank[]
): { next: OvrStats & { ovr: number }; statChanges: SeasonOvrImpact["statChanges"] } {
  const next: OvrStats = {
    vision: current.vision,
    pressure: current.pressure,
    recovery: current.recovery,
  };

  const statChanges: SeasonOvrImpact["statChanges"] = [];

  for (const row of rankedDeltas) {
    const statKey = dimensionKeyToStatKey(row.key);
    const from = next[statKey];
    const applied = growthDimensionDeltaToOvrStatDelta(row.delta);
    const to = clampOvrStat(from + applied);
    next[statKey] = to;

    if (applied > 0) {
      const meta = STAT_LABELS[statKey];
      statChanges.push({
        label: meta.label,
        labelKo: meta.labelKo,
        from,
        to,
        delta: to - from,
      });
    }
  }

  return {
    next: ovrBundleFromStats(next),
    statChanges,
  };
}

export function buildSeasonOvrImpact(
  currentProfile: PlayerGrowthOvrDoc | null,
  rankedDeltas: DimensionDeltaRank[]
): SeasonOvrImpact | null {
  if (!rankedDeltas.length) return null;

  const before = currentProfile ? ovrBundleFromProfile(currentProfile) : defaultOvrBundle();
  const { next, statChanges } = applySeasonDimensionDeltas(before, rankedDeltas);

  return {
    before,
    after: next,
    ovrDelta: next.ovr - before.ovr,
    statChanges,
  };
}

export function buildOvrDocFromStats(input: {
  playerId: string;
  playerName: string;
  stats: OvrStats;
  source: PlayerGrowthOvrDoc["source"];
  lastSeason?: string | null;
}): PlayerGrowthOvrDoc {
  const ovr = computeOvrFromStats(input.stats);
  const now = Date.now();
  return {
    schemaVersion: 1,
    playerId: input.playerId,
    playerName: input.playerName.trim() || "선수",
    ovr,
    vision: input.stats.vision,
    pressure: input.stats.pressure,
    recovery: input.stats.recovery,
    lastSeason: input.lastSeason ?? null,
    lastAppliedAt: input.source === "season_apply" ? now : null,
    updatedAt: now,
    source: input.source,
  };
}
