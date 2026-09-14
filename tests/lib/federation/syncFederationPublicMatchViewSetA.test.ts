import { planSetA, type ClubRow, type SetAInput } from "../../../functions/src/federation/syncFederationPublicMatchViewCore";

const home = { id: "p1", linkStatus: "EXACT_LINKED" as const, platformTeamId: "X", federationTeamId: "fx" };
const away = { id: "p2", linkStatus: "EXACT_LINKED" as const, platformTeamId: "Z", federationTeamId: "fz" };
const fixture = (): SetAInput => ({
  federationId: "fed", tournamentId: "cup", matchId: "m1", tournamentName: "Cup",
  match: { id: "m1", federationId: "fed", tournamentId: "cup", status: "LIVE",
    homeScore: 1, awayScore: 0, homeTeamId: "p1", awayTeamId: "p2",
    homeTeamName: "Home", awayTeamName: "Away", scheduledAt: "2026-09-14T10:00:00Z",
    isCanary: false, hiddenFromFieldHub: false },
  home, away, publicRow: null, clubRows: [],
});
const club = (id: string, visible = true): ClubRow => ({
  id, matchId: "m1", platformTeamId: id.split("__")[0], data: { matchId: "m1", visible },
});

describe("Batch 1B Set A projection writer contract", () => {
  it("creates consumer-compatible visible public and deterministic exact club intents", () => {
    const plan = planSetA(fixture());
    expect(plan.publicVisible).toBe(true);
    expect(plan.clubVisibleIds).toEqual(["X__m1", "Z__m1"]);
    expect(plan.writes.map(w => w.path)).toEqual([
      "federations/fed/tournaments/cup/publicMatches/m1",
      "federations/fed/clubMatchProjections/X__m1",
      "federations/fed/clubMatchProjections/Z__m1",
    ]);
    expect(plan.writes[0].patch).toMatchObject({ tournamentName: "Cup", publicStatus: "LIVE",
      scheduledAt: "2026-09-14T10:00:00Z", homeScore: 1, awayScore: 0,
      homeDisplayName: "Home", awayDisplayName: "Away", publicVisible: true });
    expect(plan.writes[1].patch.sourceRevision).toMatch(/^[0-9a-f]{64}$/);
    expect(plan.writes[1].patch).toMatchObject({ teamDisplayName: "Home", opponentDisplayName: "Away",
      teamScore: 1, opponentScore: 0, status: "LIVE", matchOpsStatus: "LIVE",
      kickoffAt: "2026-09-14T10:00:00Z", result: "PENDING" });
  });
  it("hides canary, hidden, and either unknown visibility flag", () => {
    for (const flag of ["isCanary", "hiddenFromFieldHub"] as const) {
      const input = fixture(); input.match![flag] = true;
      expect(planSetA(input).writes).toEqual([]);
      input.publicRow = { publicVisible: true, publicStoryEvents: [{ publicSafeText: "safe" }] };
      expect(planSetA(input).writes).toEqual([{ path: "federations/fed/tournaments/cup/publicMatches/m1",
        patch: { publicVisible: false }, merge: true }]);
      input.match![flag] = undefined;
      expect(planSetA(input).publicVisible).toBe(false);
    }
  });
  it("never converts null score to zero or creates an incomplete visible document", () => {
    const input = fixture(); input.match!.homeScore = null;
    expect(planSetA(input).writes).toEqual([]);
  });
  it("requires actual tournament name for a new visible document", () => {
    const input = fixture(); input.tournamentName = null;
    expect(planSetA(input).writes).toEqual([]);
  });
  it("never delivers club to display-only identity and hides its stale document", () => {
    const input = fixture(); input.home = { ...home, linkStatus: "DISPLAY_ONLY" };
    input.clubRows = [club("X__m1")];
    const plan = planSetA(input);
    expect(plan.clubVisibleIds).toEqual(["Z__m1"]);
    expect(plan.writes).toContainEqual({ path: "federations/fed/clubMatchProjections/X__m1",
      patch: { visible: false }, merge: true });
  });
  it("hides X after a confirmed link changes to Y", () => {
    const input = fixture(); input.home = { ...home, platformTeamId: "Y" };
    input.clubRows = [club("X__m1")];
    const plan = planSetA(input);
    expect(plan.clubVisibleIds).toContain("Y__m1");
    expect(plan.writes.find(w => w.path.endsWith("X__m1"))?.patch).toEqual({ visible: false });
  });
  it("holds club delivery when both exact participants resolve to one platform team", () => {
    const input = fixture(); input.away = { ...away, platformTeamId: "X" };
    input.clubRows = [club("X__m1")];
    const plan = planSetA(input);
    expect(plan.clubVisibleIds).toEqual([]);
    expect(plan.writes.find(w => w.path.endsWith("X__m1"))?.patch).toEqual({ visible: false });
  });
  it("source delete hides only existing public and club documents", () => {
    const input = fixture(); input.match = null; input.home = null; input.away = null;
    expect(planSetA(input).writes).toEqual([]);
    input.publicRow = { publicVisible: true, publicStoryEvents: [{ publicSafeText: "safe" }] };
    input.clubRows = [club("X__m1")];
    const plan = planSetA(input);
    expect(plan.writes.map(w => w.patch)).toEqual([{ publicVisible: false }, { visible: false }]);
    expect(plan.writes.every(w => w.merge)).toBe(true);
  });
  it("retry after applying owned patches writes nothing and preserves story fields", () => {
    const input = fixture(); input.publicRow = { publicStoryEvents: [{ publicSafeText: "safe" }] };
    const first = planSetA(input);
    expect(first.writes[0].patch).not.toHaveProperty("publicStoryEvents");
    input.publicRow = { ...input.publicRow, ...first.writes[0].patch };
    input.clubRows = first.writes.slice(1).map(w => ({
      id: w.path.split("/").at(-1)!, matchId: "m1",
      platformTeamId: String(w.patch.platformTeamId), data: { ...w.patch },
    }));
    expect(planSetA(input).writes).toEqual([]);
    expect(input.publicRow.publicStoryEvents).toEqual([{ publicSafeText: "safe" }]);
  });
  it("never plans canonical, event, bracket, story, or notice writes", () => {
    for (const write of planSetA(fixture()).writes) {
      expect(write.path).toMatch(/\/publicMatches\/|\/clubMatchProjections\//);
      expect(Object.keys(write.patch).some(k => /story|notice|bracket/i.test(k))).toBe(false);
    }
  });
});
