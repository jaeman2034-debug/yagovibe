import type { ExactParticipant, FederationMatch, FederationMatchEvent } from "../../../functions/src/shared/federation/matchOps/federationMatchOps";
import { resolveMatchWinner } from "../../../functions/src/shared/federation/matchOps/federationMatchWinnerResolution";
import { assessMatchScoreEventConsistency, assessOfficialReadiness } from "../../../functions/src/shared/federation/matchOps/federationMatchOpsConsistency";
import { inspectBracketDependency } from "../../../functions/src/shared/federation/matchOps/federationMatchBracketDependency";
import { inspectBracketChronology } from "../../../functions/src/shared/federation/matchOps/federationMatchBracketChronology";
import { canClientTransitionMatchStatus, isMatchLockedForDirectEdit } from "../../../functions/src/shared/federation/matchOps/federationMatchOpsStatus";
import { federationMatchDocPath, parseFederationMatch } from "../../../functions/src/shared/federation/matchOps/federationMatchOpsFirestore";

const home: ExactParticipant = { id: "h", federationTeamId: "fh", platformTeamId: "ph", linkStatus: "EXACT_LINKED" };
const away: ExactParticipant = { id: "a", federationTeamId: "fa", platformTeamId: "pa", linkStatus: "EXACT_LINKED" };
const match: FederationMatch = {
  id: "m1", federationId: "fed", tournamentId: "cup", status: "CONFIRMED",
  homeScore: 1, awayScore: 0, homeTeamId: "h", awayTeamId: "a",
  homeTeamName: "Exact Home", awayTeamName: "Exact Away", scheduledAt: "2026-09-14T10:00:00Z",
};
const goal: FederationMatchEvent = { id: "e1", type: "GOAL", teamSide: "home", status: "CONFIRMED" };

describe("Batch 1A pure MatchOps core", () => {
  it("uses exact participant IDs and score, never partial team names", () => {
    expect(resolveMatchWinner(match, home, away)).toMatchObject({ ok: true, value: { side: "home" } });
    expect(resolveMatchWinner({ ...match, homeTeamName: "Exact" }, { ...home, id: "wrong" }, away).ok).toBe(false);
    expect(resolveMatchWinner({ ...match, homeScore: null }, home, away).ok).toBe(false);
    expect(resolveMatchWinner({ ...match, awayScore: 1 }, home, away).ok).toBe(false);
  });

  it("holds on score/event mismatch and ignores VOID goals", () => {
    expect(assessMatchScoreEventConsistency(match, [goal]).ok).toBe(true);
    expect(assessMatchScoreEventConsistency(match, [{ ...goal, status: "VOID" }]).ok).toBe(false);
    expect(assessMatchScoreEventConsistency({ ...match, homeScore: 2 }, [goal]).ok).toBe(false);
  });

  it("requires exact identity, resolved dependencies, consistent score and confirmed state before OFFICIAL", () => {
    expect(assessOfficialReadiness(match, [goal], home, away).ok).toBe(true);
    expect(assessOfficialReadiness(match, [goal], { ...home, linkStatus: "DISPLAY_ONLY" }, away).ok).toBe(false);
    expect(assessOfficialReadiness({ ...match, homeSource: { matchId: "up", outcome: "WINNER", side: "home" }, homeTeamId: null }, [goal], home, away).ok).toBe(false);
    expect(assessOfficialReadiness({ ...match, homeSource: { matchId: "up", outcome: "WINNER", side: "home" } }, [goal], home, away).ok).toBe(false);
    expect(assessOfficialReadiness({ ...match, status: "FINISHED" }, [goal], home, away).ok).toBe(false);
  });

  it("blocks client OFFICIAL transitions and edits after OFFICIAL", () => {
    expect(canClientTransitionMatchStatus("REVIEW_REQUIRED", "CONFIRMED")).toBe(true);
    expect(canClientTransitionMatchStatus("CONFIRMED", "OFFICIAL")).toBe(false);
    expect(canClientTransitionMatchStatus("OFFICIAL", "CONFIRMED")).toBe(false);
    expect(isMatchLockedForDirectEdit("OFFICIAL")).toBe(true);
  });

  it("holds missing, self, ambiguous, cyclic and out-of-order bracket sources", () => {
    const source = { ...match, id: "up", status: "OFFICIAL" as const, scheduledAt: "2026-09-14T09:00:00Z" };
    const dependent = { ...match, id: "down", scheduledAt: "2026-09-14T11:00:00Z", homeSource: { matchId: "up", outcome: "WINNER" as const, side: "home" as const } };
    expect(inspectBracketDependency(dependent, "home", [source]).ok).toBe(true);
    expect(inspectBracketDependency(dependent, "home", []).ok).toBe(false);
    expect(inspectBracketDependency(dependent, "home", [source, source]).ok).toBe(false);
    expect(inspectBracketDependency({ ...dependent, homeSource: { ...dependent.homeSource!, matchId: "down" } }, "home", [source]).ok).toBe(false);
    expect(inspectBracketChronology(dependent, [source]).ok).toBe(true);
    expect(inspectBracketChronology(dependent, [{ ...source, homeSource: { matchId: "down", outcome: "WINNER", side: "home" } }]).ok).toBe(false);
    expect(inspectBracketChronology({ ...dependent, scheduledAt: "2026-09-14T08:00:00Z" }, [source]).ok).toBe(false);
  });

  it("constructs canonical paths and rejects malformed parse/path input", () => {
    expect(federationMatchDocPath("fed", "cup", "m1")).toBe("federations/fed/tournaments/cup/matches/m1");
    expect(() => federationMatchDocPath("fed/other", "cup", "m1")).toThrow();
    expect(parseFederationMatch("m1", { ...match })).toMatchObject({ id: "m1", status: "CONFIRMED" });
    expect(parseFederationMatch("m1", { ...match, homeScore: "1" })).toBeNull();
  });
});
