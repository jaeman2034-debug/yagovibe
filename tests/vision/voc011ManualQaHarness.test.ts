/**
 * VOC-011 / PAI-011 Manual QA harness (fixture · logic)
 * Complements browser checklist in VOC_011_MANUAL_QA.md
 */

import {
  buildPeerBenchmarkFromPlayerFii,
  buildPeerBenchmarkIdentity,
  fiiSummaryPlayersToPlayerFii,
  PEER_BENCHMARK_COPY_FALLBACK,
  PEER_BENCHMARK_COPY_PRIMARY,
  PEER_BENCHMARK_MIN_N,
} from "@/lib/vision/peerBenchmarkFromPlayerFii";
import { buildParentIntelligenceFromFiiSummary } from "@/lib/vision/fiiSummaryParentProvider";
import { findPlayerFiiEntry } from "@/lib/vision/playerIdentityResolver";
import type { FiiSummaryDocument } from "@/lib/vision/fiiSummaryTypes";
import type { PlayerFii } from "@/lib/vision/visionTypes";
import * as fs from "fs";
import * as path from "path";

function loadFixture(): FiiSummaryDocument {
  const p = path.join(
    process.cwd(),
    "public/fixtures/vision/rc4_m2_fii_summary_clip_002.json"
  );
  return JSON.parse(fs.readFileSync(p, "utf8")) as FiiSummaryDocument;
}

function makeFii(n: number, child?: PlayerFii): PlayerFii[] {
  const list: PlayerFii[] = [];
  for (let i = 0; i < n; i++) {
    list.push({ trackId: `T${i}`, playerId: `P${i}`, fii: 40 + i });
  }
  if (child) list[0] = { ...list[0], ...child };
  return list;
}

describe("VOC-011 Manual QA harness", () => {
  const matchId = "vision-pilot-pass01-clip-002";
  const teamId = "qa-team-voc011";

  it("QA-1 ageGroup present: primary copy · n>=5 · child/peer finite", () => {
    const doc = loadFixture();
    const trackId = doc.playerFii[0].trackId;
    const childFii = doc.playerFii[0].fii;
    const view = buildParentIntelligenceFromFiiSummary({
      doc,
      teamId,
      playerId: "child-uid",
      trackId,
      ageGroup: "U-12",
      matchId,
      playerName: "QA자녀",
    });
    const peer = view.peerBenchmark;
    expect(peer).not.toBeNull();
    expect(peer!.headlineCopy).toBe(PEER_BENCHMARK_COPY_PRIMARY);
    expect(peer!.n).toBeGreaterThanOrEqual(PEER_BENCHMARK_MIN_N);
    expect(peer!.childValue).toBe(childFii);
    expect(Number.isFinite(peer!.peerMean)).toBe(true);
    expect(Number.isNaN(peer!.peerMean)).toBe(false);
    expect(peer!.ageGroup).toBe("U-12");
  });

  it("QA-2 ageGroup missing: fallback copy · no U-age in headline", () => {
    const doc = loadFixture();
    const trackId = doc.playerFii[0].trackId;
    const view = buildParentIntelligenceFromFiiSummary({
      doc,
      teamId,
      playerId: "child-uid",
      trackId,
      ageGroup: null,
      matchId,
    });
    const peer = view.peerBenchmark;
    expect(peer).not.toBeNull();
    expect(peer!.headlineCopy).toBe(PEER_BENCHMARK_COPY_FALLBACK);
    expect(peer!.headlineCopy).not.toMatch(/연령/);
    expect(peer!.ageGroup).toBeNull();
    expect(Number.isFinite(peer!.peerMean)).toBe(true);
  });

  it("QA-3 n < 5: peerBenchmark null (미노출)", () => {
    const identity = buildPeerBenchmarkIdentity({
      teamId,
      playerId: "P0",
      trackId: "T0",
    });
    const result = buildPeerBenchmarkFromPlayerFii({
      teamId,
      ageGroup: "U-12",
      matchId,
      playerFii: makeFii(4),
      identity,
    });
    expect(result).toBeNull();
  });

  it("QA-4 matching: findPlayerFiiEntry aligns childValue; wrong track not used", () => {
    const entries = makeFii(8, {
      trackId: "CHILD-TRACK",
      playerId: "child-uid",
      fii: 91,
    });
    entries[1] = { trackId: "OTHER", playerId: "other-uid", fii: 11 };
    const identity = buildPeerBenchmarkIdentity({
      teamId,
      playerId: "child-uid",
      trackId: "CHILD-TRACK",
    });
    const hit = findPlayerFiiEntry(entries, identity);
    expect(hit?.fii).toBe(91);
    const peer = buildPeerBenchmarkFromPlayerFii({
      teamId,
      ageGroup: "U-12",
      matchId,
      playerFii: entries,
      identity,
    });
    expect(peer!.childValue).toBe(91);
    expect(peer!.childValue).not.toBe(11);
  });

  it("QA-5 regression wire: fii_summary parent view still builds without peer fields required", () => {
    const doc = loadFixture();
    const view = buildParentIntelligenceFromFiiSummary({
      doc,
      playerName: "자녀",
      teamName: "팀",
    });
    expect(view.sessionSummary || view.matchSummary).toBeTruthy();
    expect(view.peerBenchmark ?? null).toBeNull();
    expect(view.hasVisionAnalysis).toBe(true);
  });

  it("QA gate: fixture playerFii maps to valid PlayerFii for mean", () => {
    const doc = loadFixture();
    const mapped = fiiSummaryPlayersToPlayerFii(doc.playerFii);
    expect(mapped.length).toBe(doc.playerFii.length);
    expect(mapped.every((p) => Number.isFinite(p.fii))).toBe(true);
  });
});
