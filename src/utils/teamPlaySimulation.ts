import type { PlayPlayerStatsDoc } from "@/utils/playerStats";

export type SimGoal = { scorerName: string; count: number };

export type LightMatchSimResult = {
  homeName: string;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
  /** 팀 득점만 (이름별 집계) */
  homeScorers: SimGoal[];
};

function poissonSample(lambda: number): number {
  const L = Math.max(0.05, lambda);
  let k = 0;
  let p = 1;
  const expMinusL = Math.exp(-L);
  do {
    k += 1;
    p *= Math.random();
  } while (p > expMinusL && k < 12);
  return k - 1;
}

function weightedPickScorer(players: readonly PlayPlayerStatsDoc[]): PlayPlayerStatsDoc | null {
  const pool = players.filter((p) => p.mainPosition !== "GK");
  if (pool.length === 0) return players[0] ?? null;
  let w = 0;
  const weights = pool.map((p) => {
    const base = 1 + (p.stats?.shoot ?? 3) * 0.6 + (p.stats?.pass ?? 3) * 0.15;
    w += base;
    return w;
  });
  const r = Math.random() * w;
  const idx = weights.findIndex((x) => r <= x);
  return pool[Math.max(0, idx)] ?? pool[0];
}

/**
 * 팀 OVR 합 vs 상대 파워 — 가벼운 득점 시뮬 (Poisson + 슈팅 가중 득점자)
 */
export function runLightTeamSimulation(
  teamName: string,
  homeRoster: readonly PlayPlayerStatsDoc[],
  awayName: string,
  awayPower: number
): LightMatchSimResult {
  const teamPower =
    homeRoster.length > 0 ? homeRoster.reduce((s, p) => s + Math.max(20, p.ovr), 0) : Math.max(60, teamName.length * 6);
  const denom = teamPower + Math.max(40, awayPower) + 1e-6;
  const side = teamPower / denom;
  const homeLambda = 0.85 + 4.2 * side;
  const awayLambda = 0.85 + 4.2 * (1 - side);
  let homeGoals = poissonSample(homeLambda);
  let awayGoals = poissonSample(awayLambda);
  homeGoals = Math.min(8, homeGoals);
  awayGoals = Math.min(8, awayGoals);

  const homeScorersMap = new Map<string, number>();
  for (let g = 0; g < homeGoals; g++) {
    const p = weightedPickScorer(homeRoster);
    if (!p) break;
    homeScorersMap.set(p.displayName, (homeScorersMap.get(p.displayName) ?? 0) + 1);
  }
  const homeScorers: SimGoal[] = [...homeScorersMap.entries()].map(([scorerName, count]) => ({
    scorerName,
    count,
  }));

  return {
    homeName: teamName.trim() || "우리 팀",
    awayName: awayName.trim() || "상대 팀",
    homeGoals,
    awayGoals,
    homeScorers,
  };
}
