/**
 * VOC-012 / PAI-012 Manual QA harness (logic · fixture)
 * Complements VOC_012_MANUAL_QA.md — does NOT declare PAI-012 PASS
 */

import {
  buildMatchFlowTrendForPlayer,
  buildMatchFlowTrendPayload,
  formatMatchFlowDelta,
  formatMatchFlowDisplayLine,
  MATCH_FLOW_TREND_COPY_N2,
  MATCH_FLOW_TREND_COPY_N3,
  MATCH_FLOW_TREND_HEADLINE,
  MATCH_FLOW_TREND_MAX_K,
  type PreviousMatchPlayerFii,
} from "@/lib/vision/matchFlowTrendFromPlayerFii";
import { findPlayerFiiEntry, resolvePlayerIdentity } from "@/lib/vision/playerIdentityResolver";
import type { PlayerFii } from "@/lib/vision/visionTypes";

function fii(playerId: string, value: number, trackId = playerId): PlayerFii {
  return { playerId, trackId, name: playerId, fii: value };
}

function prev(
  matchId: string,
  players: PlayerFii[],
  completedAtMs = 1
): PreviousMatchPlayerFii {
  return { matchId, playerFii: players, completedAtMs };
}

/** Simulate index list: exclude current → sort desc by completedAt → take maxK */
function previousWindow(
  currentMatchId: string,
  rows: Array<{ matchId: string; completedAtMs: number; players: PlayerFii[] }>
): PreviousMatchPlayerFii[] {
  return rows
    .filter((r) => r.matchId !== currentMatchId)
    .slice()
    .sort((a, b) => b.completedAtMs - a.completedAtMs)
    .slice(0, MATCH_FLOW_TREND_MAX_K)
    .map((r) => prev(r.matchId, r.players, r.completedAtMs));
}

/** Sort-only helper for QA-5 */
function orderedPrevious(
  rows: Array<{ matchId: string; completedAtMs: number; players: PlayerFii[] }>
): PreviousMatchPlayerFii[] {
  return rows
    .slice()
    .sort((a, b) => b.completedAtMs - a.completedAtMs)
    .map((r) => prev(r.matchId, r.players, r.completedAtMs));
}

describe("VOC-012 Manual QA harness", () => {
  const identity = resolvePlayerIdentity({
    teamId: "qa-team-voc012",
    playerId: "p1",
    trackId: "t1",
  });

  it("QA-1 n=3: exclude current · max 3 · mean/delta · copy", () => {
    const previous = previousWindow("m-now", [
      { matchId: "m-now", completedAtMs: 900, players: [fii("p1", 99)] },
      { matchId: "m3", completedAtMs: 800, players: [fii("p1", 60)] },
      { matchId: "m2", completedAtMs: 700, players: [fii("p1", 66)] },
      { matchId: "m1", completedAtMs: 600, players: [fii("p1", 70)] },
      { matchId: "m0", completedAtMs: 500, players: [fii("p1", 10)] },
    ]);

    expect(previous.map((p) => p.matchId)).toEqual(["m3", "m2", "m1"]);
    expect(previous).toHaveLength(3);

    const payload = buildMatchFlowTrendPayload({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 72)],
      previousMatches: previous,
      ranking: [{ name: "One", fii: 72, playerId: "p1", trackId: "t1" }],
    });
    expect(payload).not.toBeNull();
    expect(payload!.headlineCopy).toBe(MATCH_FLOW_TREND_HEADLINE);
    expect(payload!.windowCopy).toBe(MATCH_FLOW_TREND_COPY_N3);
    expect(payload!.windowN).toBe(3);
    expect(payload!.previousMatchIds).not.toContain("m-now");

    const row = payload!.byPlayer["pid:p1"];
    expect(row.currentFii).toBe(72);
    expect(row.previousMean).toBe(65.3);
    expect(row.delta).toBe(6.7);
    expect(formatMatchFlowDelta(row.delta)).toBe("+6.7");
    expect(formatMatchFlowDisplayLine(row)).toContain("최근 3경기 평균");
  });

  it("QA-2 n=2: card payload visible · copy N2", () => {
    const payload = buildMatchFlowTrendPayload({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 72)],
      previousMatches: [prev("m2", [fii("p1", 60)]), prev("m1", [fii("p1", 70)])],
      ranking: [{ name: "One", fii: 72, playerId: "p1", trackId: "t1" }],
    });
    expect(payload).not.toBeNull();
    expect(payload!.windowCopy).toBe(MATCH_FLOW_TREND_COPY_N2);
    expect(payload!.windowN).toBe(2);
    expect(payload!.byPlayer["pid:p1"].previousMean).toBe(65);
  });

  it("QA-3 n<2: trend null · no NaN mean", () => {
    const payload = buildMatchFlowTrendPayload({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 72)],
      previousMatches: [prev("m1", [fii("p1", 60)])],
      ranking: [{ name: "One", fii: 72, playerId: "p1", trackId: "t1" }],
    });
    expect(payload).toBeNull();

    const one = buildMatchFlowTrendForPlayer({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 72)],
      previousMatches: [prev("m1", [fii("p1", 60)])],
      identity,
    });
    expect(one).toBeNull();
  });

  it("QA-4 matching: target FII only · no other-player bleed", () => {
    const previous = [
      prev("m2", [fii("p1", 60), fii("p2", 10)]),
      prev("m1", [fii("p1", 70), fii("p2", 11)]),
    ];
    const hit = findPlayerFiiEntry(previous[0].playerFii, identity);
    expect(hit?.fii).toBe(60);

    const payload = buildMatchFlowTrendPayload({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 72), fii("p2", 50)],
      previousMatches: previous,
      ranking: [
        { name: "One", fii: 72, playerId: "p1", trackId: "t1" },
        { name: "Two", fii: 50, playerId: "p2", trackId: "t2" },
      ],
    });
    expect(payload!.byPlayer["pid:p1"].previousMean).toBe(65);
    expect(payload!.byPlayer["pid:p1"].previousMean).not.toBe(10.5);
    expect(payload!.byPlayer["pid:p2"].previousMean).toBe(10.5);
  });

  it("QA-5 ordering: analysisCompletedAt desc · updatedAt-style ms fallback order", () => {
    const previous = orderedPrevious([
      { matchId: "old", completedAtMs: 100, players: [fii("p1", 40)] },
      { matchId: "mid", completedAtMs: 200, players: [fii("p1", 50)] },
      { matchId: "new", completedAtMs: 300, players: [fii("p1", 60)] },
    ]);
    expect(previous.map((p) => p.matchId)).toEqual(["new", "mid", "old"]);
  });

  it("QA-6 regression: ranking without trend keys still builds empty-safe payload gate", () => {
    const payload = buildMatchFlowTrendPayload({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p9", 80)],
      previousMatches: [prev("m2", [fii("p1", 60)]), prev("m1", [fii("p1", 70)])],
      ranking: [{ name: "Ghost", fii: 80, playerId: "p9", trackId: "t9" }],
    });
    // team window ok but player p9 has no previous samples → null payload
    expect(payload).toBeNull();
  });
});
