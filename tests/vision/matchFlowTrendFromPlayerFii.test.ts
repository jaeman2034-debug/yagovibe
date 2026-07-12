import {
  buildMatchFlowTrendForPlayer,
  buildMatchFlowTrendPayload,
  formatMatchFlowDisplayLine,
  MATCH_FLOW_TREND_COPY_N2,
  MATCH_FLOW_TREND_COPY_N3,
  MATCH_FLOW_TREND_HEADLINE,
  MATCH_FLOW_TREND_MIN_N,
  type PreviousMatchPlayerFii,
} from "@/lib/vision/matchFlowTrendFromPlayerFii";
import { resolvePlayerIdentity } from "@/lib/vision/playerIdentityResolver";
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

describe("buildMatchFlowTrendForPlayer", () => {
  const identity = resolvePlayerIdentity({
    teamId: "t1",
    playerId: "p1",
    trackId: "t1",
  });

  it("returns null when previous n < minN", () => {
    const result = buildMatchFlowTrendForPlayer({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 70)],
      previousMatches: [prev("m1", [fii("p1", 60)])],
      identity,
    });
    expect(result).toBeNull();
  });

  it("computes mean and delta for n=2", () => {
    const result = buildMatchFlowTrendForPlayer({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 72)],
      previousMatches: [
        prev("m3", [fii("p1", 60)]),
        prev("m2", [fii("p1", 70)]),
      ],
      identity,
      name: "Player One",
    });
    expect(result).not.toBeNull();
    expect(result!.n).toBe(2);
    expect(result!.minN).toBe(MATCH_FLOW_TREND_MIN_N);
    expect(result!.currentFii).toBe(72);
    expect(result!.previousMean).toBe(65);
    expect(result!.delta).toBe(7);
    expect(formatMatchFlowDisplayLine(result!)).toContain("현재 FII 72");
  });

  it("caps previous at max 3 matches", () => {
    const result = buildMatchFlowTrendForPlayer({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 80)],
      previousMatches: [
        prev("m4", [fii("p1", 10)]),
        prev("m3", [fii("p1", 20)]),
        prev("m2", [fii("p1", 30)]),
        prev("m1", [fii("p1", 40)]),
      ],
      identity,
    });
    expect(result!.n).toBe(3);
    expect(result!.previousMean).toBe(20);
    expect(result!.previousMatchIds).toEqual(["m4", "m3", "m2"]);
  });

  it("excludes current matchId if present in previous list", () => {
    const result = buildMatchFlowTrendForPlayer({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 50)],
      previousMatches: [
        prev("m-now", [fii("p1", 99)]),
        prev("m2", [fii("p1", 40)]),
        prev("m1", [fii("p1", 60)]),
      ],
      identity,
    });
    expect(result!.n).toBe(2);
    expect(result!.previousMatchIds).not.toContain("m-now");
  });
});

describe("buildMatchFlowTrendPayload", () => {
  it("returns null when team previous analyses < 2", () => {
    const result = buildMatchFlowTrendPayload({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 70)],
      previousMatches: [prev("m1", [fii("p1", 60)])],
      ranking: [{ name: "A", fii: 70, playerId: "p1", trackId: "t1" }],
    });
    expect(result).toBeNull();
  });

  it("uses n=3 window copy when 3 previous matches", () => {
    const result = buildMatchFlowTrendPayload({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 72), fii("p2", 50)],
      previousMatches: [
        prev("m3", [fii("p1", 60), fii("p2", 40)]),
        prev("m2", [fii("p1", 66), fii("p2", 44)]),
        prev("m1", [fii("p1", 70), fii("p2", 48)]),
      ],
      ranking: [
        { name: "One", fii: 72, playerId: "p1", trackId: "t1" },
        { name: "Two", fii: 50, playerId: "p2", trackId: "t2" },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.headlineCopy).toBe(MATCH_FLOW_TREND_HEADLINE);
    expect(result!.windowCopy).toBe(MATCH_FLOW_TREND_COPY_N3);
    expect(result!.windowN).toBe(3);
    expect(result!.byPlayer["pid:p1"]).toBeDefined();
    expect(result!.byPlayer["pid:p2"]).toBeDefined();
  });

  it("uses n=2 window copy when only 2 previous matches", () => {
    const result = buildMatchFlowTrendPayload({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 72)],
      previousMatches: [prev("m2", [fii("p1", 60)]), prev("m1", [fii("p1", 70)])],
      ranking: [{ name: "One", fii: 72, playerId: "p1", trackId: "t1" }],
    });
    expect(result!.windowCopy).toBe(MATCH_FLOW_TREND_COPY_N2);
    expect(result!.windowN).toBe(2);
  });

  it("omits players with fewer than 2 previous FII samples", () => {
    const result = buildMatchFlowTrendPayload({
      currentMatchId: "m-now",
      currentPlayerFii: [fii("p1", 72), fii("p2", 55)],
      previousMatches: [
        prev("m2", [fii("p1", 60)]),
        prev("m1", [fii("p1", 70), fii("p2", 50)]),
      ],
      ranking: [
        { name: "One", fii: 72, playerId: "p1", trackId: "t1" },
        { name: "Two", fii: 55, playerId: "p2", trackId: "t2" },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.byPlayer["pid:p1"]).toBeDefined();
    expect(result!.byPlayer["pid:p2"]).toBeUndefined();
  });
});
