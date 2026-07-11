import {
  buildPeerBenchmarkFromPlayerFii,
  buildPeerBenchmarkIdentity,
  PEER_BENCHMARK_COPY_FALLBACK,
  PEER_BENCHMARK_COPY_PRIMARY,
  PEER_BENCHMARK_MIN_N,
} from "@/lib/vision/peerBenchmarkFromPlayerFii";
import type { PlayerFii } from "@/lib/vision/visionTypes";

function entries(n: number, child?: { trackId: string; fii: number }): PlayerFii[] {
  const list: PlayerFii[] = [];
  for (let i = 0; i < n; i++) {
    list.push({ trackId: `T${i}`, fii: 50 + i, playerId: `P${i}` });
  }
  if (child) {
    list[0] = { ...list[0], trackId: child.trackId, fii: child.fii, playerId: "child" };
  }
  return list;
}

describe("buildPeerBenchmarkFromPlayerFii", () => {
  const identity = buildPeerBenchmarkIdentity({
    teamId: "team-a",
    playerId: "child",
    trackId: "T0",
  });

  it("returns null when n < minN", () => {
    const result = buildPeerBenchmarkFromPlayerFii({
      teamId: "team-a",
      ageGroup: "U-12",
      matchId: "m1",
      playerFii: entries(PEER_BENCHMARK_MIN_N - 1),
      identity,
    });
    expect(result).toBeNull();
  });

  it("uses primary copy when ageGroup present", () => {
    const result = buildPeerBenchmarkFromPlayerFii({
      teamId: "team-a",
      ageGroup: "U-12",
      matchId: "m1",
      playerFii: entries(PEER_BENCHMARK_MIN_N, { trackId: "T0", fii: 70 }),
      identity,
    });
    expect(result).not.toBeNull();
    expect(result!.headlineCopy).toBe(PEER_BENCHMARK_COPY_PRIMARY);
    expect(result!.n).toBe(PEER_BENCHMARK_MIN_N);
    expect(result!.childValue).toBe(70);
    expect(result!.delta).toBe(roundExpected(70, result!.peerMean));
  });

  it("falls back to team average copy when ageGroup missing", () => {
    const result = buildPeerBenchmarkFromPlayerFii({
      teamId: "team-a",
      ageGroup: null,
      matchId: "m1",
      playerFii: entries(PEER_BENCHMARK_MIN_N),
      identity,
    });
    expect(result!.headlineCopy).toBe(PEER_BENCHMARK_COPY_FALLBACK);
    expect(result!.cohortKey).toBe("team-a:team");
  });
});

function roundExpected(child: number, peerMean: number): number {
  return Math.round((child - peerMean) * 10) / 10;
}
