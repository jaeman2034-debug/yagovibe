/** Batch 1A server OFFICIAL authority contract. */
const serverModule = "../../../functions/src/federation/confirmFederationMatchOfficialCore";
const clientModule = "../../../src/lib/federation/matchOps/federationMatchOpsOfficialRequest";
jest.mock("firebase/functions", () => ({ httpsCallable: jest.fn() }));
jest.mock("../../../src/lib/firebase", () => ({ functions: {} }));

const request = {
  federationId: "fed1",
  tournamentId: "cup1",
  matchId: "match1",
  actorUid: "publisher1",
  requestId: "request1",
};

function fixture(options: { publisher?: boolean; scoreMismatch?: boolean; ambiguousIdentity?: boolean; unresolvedBracket?: boolean } = {}) {
  const match: Record<string, unknown> = {
    id: request.matchId,
    federationId: request.federationId,
    tournamentId: request.tournamentId,
    status: "CONFIRMED",
    homeScore: options.scoreMismatch ? 9 : 1,
    awayScore: 0,
    homeTeamId: "participant-home",
    awayTeamId: "participant-away",
    homeTeamName: "Home",
    awayTeamName: "Away",
    scheduledAt: "2026-09-14T10:00:00Z",
    ...(options.unresolvedBracket ? { homeSource: { matchId: "missing", outcome: "WINNER", side: "home" } } : {}),
  };
  const audits = new Map<string, Record<string, unknown>>();
  const writes: string[] = [];
  const participants: Record<string, Record<string, unknown>> = {
    "participant-home": {
      id: "participant-home",
      linkStatus: options.ambiguousIdentity ? "DISPLAY_ONLY" : "EXACT_LINKED",
      federationTeamId: "f-home",
      platformTeamId: "p-home",
    },
    "participant-away": {
      id: "participant-away",
      linkStatus: "EXACT_LINKED",
      federationTeamId: "f-away",
      platformTeamId: "p-away",
    },
  };
  const tx = {
    getFederation: jest.fn(async () => ({ ownerUid: options.publisher === false ? "someone-else" : request.actorUid })),
    getMatch: jest.fn(async () => ({ ...match })),
    getEvents: jest.fn(async () => [{ id: "goal1", type: "GOAL", teamSide: "home", status: "CONFIRMED" }]),
    getParticipant: jest.fn(async (id: string) => participants[id] ?? null),
    getTournamentMatches: jest.fn(async () => [{ ...match }]),
    getAudit: jest.fn(async (id: string) => audits.get(id) ?? null),
    updateMatch: jest.fn(async (patch: Record<string, unknown>) => {
      writes.push("match");
      Object.assign(match, patch);
    }),
    createAudit: jest.fn(async (id: string, audit: Record<string, unknown>) => {
      if (audits.has(id)) throw new Error("duplicate audit");
      writes.push("audit");
      audits.set(id, audit);
    }),
  };
  const ports = { runTransaction: jest.fn(async (body: (transaction: typeof tx) => Promise<unknown>) => body(tx)) };
  return { match, audits, writes, tx, ports };
}

describe("Batch 1A OFFICIAL authority contract", () => {
  it("production adapter invokes the exact callable name with only canonical IDs", async () => {
    const { httpsCallable } = require("firebase/functions");
    const send = jest.fn(async () => ({ data: { outcome: "OFFICIAL", confirmationKey: "key", auditId: "audit" } }));
    httpsCallable.mockReturnValueOnce(send);
    const { requestFederationMatchOfficial } = require(clientModule);
    const result = await requestFederationMatchOfficial(request);
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), "confirmFederationMatchOfficial");
    expect(send).toHaveBeenCalledWith({ federationId: "fed1", tournamentId: "cup1", matchId: "match1" });
    expect(result.outcome).toBe("OFFICIAL");
  });

  it("client adapter sends only a confirmation request and performs no Firestore writes", async () => {
    const { requestFederationMatchOfficial } = require(clientModule);
    const sendCallable = jest.fn(async () => ({ outcome: "OFFICIAL", confirmationKey: "key", auditId: "audit" }));
    const updateMatch = jest.fn();
    const createAudit = jest.fn();
    await requestFederationMatchOfficial(request, { sendCallable, updateMatch, createAudit });
    expect(sendCallable).toHaveBeenCalledTimes(1);
    expect(sendCallable).toHaveBeenCalledWith({ federationId: "fed1", tournamentId: "cup1", matchId: "match1" });
    expect(updateMatch).not.toHaveBeenCalled();
    expect(createAudit).not.toHaveBeenCalled();
  });

  it("client handles an identical confirmation as NO_OP without a local mutation", async () => {
    const { requestFederationMatchOfficial } = require(clientModule);
    const sendCallable = jest.fn(async () => ({ outcome: "NO_OP", confirmationKey: "key", auditId: "audit" }));
    const result = await requestFederationMatchOfficial(request, { sendCallable });
    expect(result.outcome).toBe("NO_OP");
    expect(sendCallable).toHaveBeenCalledWith({ federationId: "fed1", tournamentId: "cup1", matchId: "match1" });
  });

  it("client propagates callable errors without mutating the current document", async () => {
    const { requestFederationMatchOfficial } = require(clientModule);
    const sendCallable = jest.fn(async () => { throw new Error("permission-denied"); });
    await expect(requestFederationMatchOfficial(request, { sendCallable })).rejects.toThrow("permission-denied");
    expect(sendCallable).toHaveBeenCalledTimes(1);
  });

  it("server rejects a non-publisher without writing", async () => {
    const { confirmFederationMatchOfficialCore } = require(serverModule);
    const f = fixture({ publisher: false });
    await expect(confirmFederationMatchOfficialCore(request, f.ports)).rejects.toThrow();
    expect(f.writes).toHaveLength(0);
  });

  it("server rejects unauthenticated confirmation without writing", async () => {
    const { confirmFederationMatchOfficialCore } = require(serverModule);
    const f = fixture();
    await expect(confirmFederationMatchOfficialCore({ ...request, actorUid: "" }, f.ports)).rejects.toThrow();
    expect(f.writes).toHaveLength(0);
  });

  it("server rejects score/event inconsistency without writing", async () => {
    const { confirmFederationMatchOfficialCore } = require(serverModule);
    const f = fixture({ scoreMismatch: true });
    await expect(confirmFederationMatchOfficialCore(request, f.ports)).rejects.toThrow();
    expect(f.writes).toHaveLength(0);
  });

  it("server rejects DISPLAY_ONLY or ambiguous participant identity without writing", async () => {
    const { confirmFederationMatchOfficialCore } = require(serverModule);
    const f = fixture({ ambiguousIdentity: true });
    await expect(confirmFederationMatchOfficialCore(request, f.ports)).rejects.toThrow();
    expect(f.writes).toHaveLength(0);
  });

  it("server rejects unresolved bracket dependency without writing", async () => {
    const { confirmFederationMatchOfficialCore } = require(serverModule);
    const f = fixture({ unresolvedBracket: true });
    await expect(confirmFederationMatchOfficialCore(request, f.ports)).rejects.toThrow();
    expect(f.writes).toHaveLength(0);
  });

  it("server atomically records one OFFICIAL match and one RESULT_OFFICIAL audit", async () => {
    const { confirmFederationMatchOfficialCore } = require(serverModule);
    const f = fixture();
    await confirmFederationMatchOfficialCore(request, f.ports);
    expect(f.ports.runTransaction).toHaveBeenCalledTimes(1);
    expect(f.match.status).toBe("OFFICIAL");
    expect(f.writes).toEqual(["match", "audit"]);
    expect([...f.audits.values()].filter((a) => a.action === "RESULT_OFFICIAL")).toHaveLength(1);
  });

  it("same confirmation request retries as a no-op with no duplicate audit", async () => {
    const { confirmFederationMatchOfficialCore } = require(serverModule);
    const f = fixture();
    await confirmFederationMatchOfficialCore(request, f.ports);
    await confirmFederationMatchOfficialCore(request, f.ports);
    expect(f.writes).toEqual(["match", "audit"]);
    expect(f.audits.size).toBe(1);
  });
});
