import { planCanonicalProjection, type ProjectionSnapshot } from "../../../functions/src/shared/federation/publicProjection/canonicalProjectionContract";
import { parseFederationMatch } from "../../../functions/src/shared/federation/matchOps/federationMatchOpsFirestore";

const participant = (id: string, team: string, linked = true) => ({
  id, platformTeamId: team, federationTeamId: `f-${team}`,
  linkStatus: linked ? "EXACT_LINKED" as const : "DISPLAY_ONLY" as const,
});
const fixture = (): ProjectionSnapshot => ({
  match: {
    id: "m1", federationId: "fed", tournamentId: "cup", status: "SCHEDULED",
    homeScore: null, awayScore: null, homeTeamId: "p1", awayTeamId: "p2",
    homeTeamName: "Home", awayTeamName: "Away", scheduledAt: "2026-09-14T10:00:00Z",
    isCanary: false, hiddenFromFieldHub: false,
  },
  home: participant("p1", "X"), away: participant("p2", "Z"),
});
const plan = (after: ProjectionSnapshot | null, before: ProjectionSnapshot | null = null,
  events: Array<{ id: string; type: string; status: string; teamSide: "home" | "away"; minute: number }> = []) =>
  planCanonicalProjection("m1", before, after, events);

describe("Batch 1B canonical projection field contract", () => {
  it("scheduled null scores hold visibility without making a fake zero", () => {
    const result = plan(fixture());
    expect(result.publicMatch).toMatchObject({ publicVisible: false, publicStatus: "BEFORE", reason: "SCORE_INCOMPLETE" });
    expect(result.publicMatch.homeScore).toBeUndefined();
    expect(result.publicMatch.awayScore).toBeUndefined();
    expect(result.club.visiblePlatformTeamIds).toEqual([]);
  });
  it("live score maps to LIVE", () => {
    const after = fixture(); after.match!.status = "LIVE"; after.match!.homeScore = 1; after.match!.awayScore = 0;
    expect(plan(after).publicMatch).toMatchObject({ publicStatus: "LIVE", homeScore: 1, awayScore: 0 });
  });
  it("valid OFFICIAL projects exact participant IDs", () => {
    const after = fixture(); after.match!.status = "OFFICIAL"; after.match!.homeScore = 2; after.match!.awayScore = 1;
    expect(plan(after).publicMatch).toMatchObject({ publicVisible: true, publicStatus: "OFFICIAL", homeParticipantId: "p1" });
    expect(plan(after).club.visiblePlatformTeamIds).toEqual(["X", "Z"]);
  });
  it("incomplete LIVE and OFFICIAL scores hide rather than replacing null with zero", () => {
    const after = fixture(); after.match!.status = "OFFICIAL";
    expect(plan(after).publicMatch).toMatchObject({ publicVisible: false, reason: "SCORE_INCOMPLETE" });
    expect(plan(after).publicMatch.homeScore).toBeUndefined();
    after.match!.status = "LIVE";
    expect(plan(after).publicMatch.publicVisible).toBe(false);
  });
  it("missing schedule or display name hides", () => {
    const after = fixture(); after.match!.scheduledAt = "";
    expect(plan(after).publicMatch.publicVisible).toBe(false);
    after.match!.scheduledAt = "2026-09-14T10:00:00Z"; after.match!.homeTeamName = "";
    expect(plan(after).publicMatch.publicVisible).toBe(false);
  });
  it("canary and hidden source both hide", () => {
    const after = fixture(); after.match!.isCanary = true;
    expect(plan(after).publicMatch.publicVisible).toBe(false);
    after.match!.isCanary = false; after.match!.hiddenFromFieldHub = true;
    expect(plan(after).publicMatch.publicVisible).toBe(false);
  });
  it("display-only names remain public display but never create club identity", () => {
    const after = fixture(); after.home = participant("p1", "X", false);
    after.match!.homeScore = 0; after.match!.awayScore = 0;
    const result = plan(after);
    expect(result.publicMatch).toMatchObject({ publicVisible: true, homeDisplayName: "Home" });
    expect(result.club.visiblePlatformTeamIds).toEqual(["Z"]);
  });
  it("team X to Y computes stale X cleanup and Y upsert", () => {
    const before = fixture(); const after = fixture(); after.home = participant("p1", "Y");
    after.match!.homeScore = 0; after.match!.awayScore = 0;
    const result = planCanonicalProjection("m1", before, after, [], [
      { id: "X__m1", matchId: "m1", platformTeamId: "X" },
      { id: "Z__m1", matchId: "m1", platformTeamId: "Z" },
    ], true);
    expect(result.club).toMatchObject({ visiblePlatformTeamIds: ["Y", "Z"],
      keepOrUpsertIds: ["Y__m1", "Z__m1"], hideProjectionIds: ["X__m1"] });
    expect(plan(after, before).noticeRecomputePlatformTeamIds).toEqual(["X", "Y", "Z"]);
    expect(result.noticeRecomputeRequired).toBe(false);
  });
  it("unlink, hidden source, and deletion each require stale club reconciliation", () => {
    const before = fixture(); const unlinked = fixture(); unlinked.home = participant("p1", "X", false);
    unlinked.match!.homeScore = 0; unlinked.match!.awayScore = 0;
    expect(plan(unlinked, before).club.visiblePlatformTeamIds).toEqual(["Z"]);
    const hidden = fixture(); hidden.match!.hiddenFromFieldHub = true;
    expect(plan(hidden, before).club.visiblePlatformTeamIds).toEqual([]);
    const deleted = plan(null, before);
    expect(deleted.publicMatch).toMatchObject({ publicVisible: false, reason: "SOURCE_DELETED" });
    expect(deleted.club.visiblePlatformTeamIds).toEqual([]);
  });
  it("confirmed story is deduplicated and ordered by minute then stable ID", () => {
    const events = [
      { id: "b", type: "GOAL", status: "CONFIRMED", teamSide: "home" as const, minute: 20, publicSafeText: "득점" },
      { id: "a", type: "YELLOW", status: "CONFIRMED", teamSide: "away" as const, minute: 20, publicSafeText: "경고" },
      { id: "b", type: "GOAL", status: "CONFIRMED", teamSide: "home" as const, minute: 20, publicSafeText: "득점" },
      { id: "c", type: "RED", status: "VOID", teamSide: "home" as const, minute: 10, publicSafeText: "퇴장" },
    ];
    const after = fixture(); after.match!.homeScore = 0; after.match!.awayScore = 0;
    expect(plan(after, null, events).publicStoryEvents.map(e => e.eventId)).toEqual(["a", "b"]);
    expect(plan(after, null, events).publicStoryEvents[0].publicSafeText).toBe("경고");
  });
  it("confirmed events without authoritative publicSafeText are omitted", () => {
    const after = fixture(); after.match!.homeScore = 0; after.match!.awayScore = 0;
    expect(plan(after, null, [{ id: "a", type: "GOAL", status: "CONFIRMED", teamSide: "home", minute: 2 }]).publicStoryEvents).toEqual([]);
  });
  it("unknown canary or hidden source holds instead of defaulting to false", () => {
    const after = fixture(); after.match!.homeScore = 0; after.match!.awayScore = 0;
    delete after.match!.isCanary;
    expect(plan(after).publicMatch).toMatchObject({ visibilityGate: "UNKNOWN", publicVisible: false, reason: "VISIBILITY_UNKNOWN" });
    after.match!.isCanary = false; delete after.match!.hiddenFromFieldHub;
    expect(plan(after).publicMatch.visibilityGate).toBe("UNKNOWN");
    delete after.match!.isCanary;
    expect(plan(after).publicMatch.visibilityGate).toBe("UNKNOWN");
    after.match!.isCanary = true;
    expect(plan(after).publicMatch).toMatchObject({ visibilityGate: "BLOCKED", reason: "CANARY" });
  });
  it("explicit false is eligible and either explicit true blocks", () => {
    const after = fixture(); after.match!.homeScore = 0; after.match!.awayScore = 0;
    expect(plan(after).publicMatch).toMatchObject({ visibilityGate: "ELIGIBLE", publicVisible: true });
    after.match!.isCanary = true;
    expect(plan(after).publicMatch).toMatchObject({ visibilityGate: "BLOCKED", publicVisible: false, reason: "CANARY" });
    after.match!.isCanary = false; after.match!.hiddenFromFieldHub = true;
    expect(plan(after).publicMatch).toMatchObject({ visibilityGate: "BLOCKED", publicVisible: false, reason: "HIDDEN" });
  });
  it("parser passes through only explicit boolean visibility flags", () => {
    const raw = { federationId: "fed", tournamentId: "cup", status: "SCHEDULED", homeScore: null,
      awayScore: null, homeTeamId: null, awayTeamId: null };
    for (const flag of ["isCanary", "hiddenFromFieldHub"] as const) {
      expect(parseFederationMatch("m1", { ...raw, [flag]: true })?.[flag]).toBe(true);
      expect(parseFederationMatch("m1", { ...raw, [flag]: false })?.[flag]).toBe(false);
      expect(parseFederationMatch("m1", { ...raw, [flag]: "false" })?.[flag]).toBeUndefined();
      expect(parseFederationMatch("m1", raw)?.[flag]).toBeUndefined();
    }
  });
  it("missing participant link history requests notice recomputation", () => {
    const after = fixture(); after.match!.homeScore = 0; after.match!.awayScore = 0;
    expect(plan(after).noticeRecomputeRequired).toBe(true);
  });
  it("contract exposes no canonical, event, or bracket write intent", () => {
    expect(plan(fixture())).toMatchObject({ writesCanonicalMatch: false, writesCanonicalEvents: false, propagatesBracket: false });
  });
});
