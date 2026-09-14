import {
  propagateFederationOfficialBracketCore,
  selectBracketTarget,
} from "../../../functions/src/federation/propagateFederationOfficialBracketCore";

const key = `official_v1_${"a".repeat(64)}`;
const input = {
  federationId: "fed1", tournamentId: "cup1", matchId: "source",
  before: { status: "CONFIRMED" }, after: { status: "OFFICIAL", confirmationKey: key },
};

function fixture() {
  const source: Record<string, any> = {
    id: "source", federationId: "fed1", tournamentId: "cup1",
    status: "OFFICIAL", confirmationKey: key, homeScore: 1, awayScore: 0,
    homeTeamId: "home-participant", awayTeamId: "away-participant",
    scheduledAt: "2026-09-14T10:00:00Z",
  };
  const target: Record<string, any> = {
    id: "target", federationId: "fed1", tournamentId: "cup1", status: "SCHEDULED",
    homeTeamId: null, awayTeamId: "other-participant",
    homeSource: { matchId: "source", outcome: "WINNER", side: "home" },
    scheduledAt: "2026-09-15T10:00:00Z",
  };
  const participants: Record<string, Record<string, unknown>> = {
    "home-participant": { linkStatus: "EXACT_LINKED", federationTeamId: "f-home", platformTeamId: "p-home" },
    "away-participant": { linkStatus: "EXACT_LINKED", federationTeamId: "f-away", platformTeamId: "p-away" },
  };
  const audits = new Map<string, Record<string, unknown>>();
  const patches: Record<string, unknown>[] = [];
  const tx = {
    getSource: jest.fn(async () => source),
    getMatches: jest.fn(async () => [source, target]),
    getTarget: jest.fn(async () => target),
    getParticipant: jest.fn(async (id: string) => participants[id] ?? null),
    getOfficialAudit: jest.fn(async () => ({
      action: "RESULT_OFFICIAL", sourceMatchId: "source", confirmationKey: key,
    })),
    getBracketAudit: jest.fn(async (id: string, auditId: string) => audits.get(`${id}/${auditId}`) ?? null),
    updateTarget: jest.fn((id: string, patch: Record<string, unknown>) => {
      expect(id).toBe("target");
      patches.push(patch);
      Object.assign(target, patch);
    }),
    createBracketAudit: jest.fn((id: string, auditId: string, audit: Record<string, unknown>) => {
      if (audits.has(`${id}/${auditId}`)) throw new Error("duplicate audit");
      audits.set(`${id}/${auditId}`, audit);
    }),
  };
  const ports = { runTransaction: jest.fn(async (body: (arg: typeof tx) => Promise<unknown>) => body(tx)) };
  return { source, target, participants, audits, patches, tx, ports };
}

describe("Batch 1A server-only bracket propagation", () => {
  it("A: ignores non-OFFICIAL transitions and unrelated OFFICIAL updates", async () => {
    const f = fixture();
    expect((await propagateFederationOfficialBracketCore({ ...input, after: { status: "LIVE" } }, f.ports)).outcome)
      .toBe("SKIPPED");
    expect((await propagateFederationOfficialBracketCore({ ...input, before: { status: "OFFICIAL" } }, f.ports)).outcome)
      .toBe("SKIPPED");
    expect(f.ports.runTransaction).not.toHaveBeenCalled();
  });

  it("B: requires the server confirmation key", async () => {
    const f = fixture();
    expect((await propagateFederationOfficialBracketCore({
      ...input, after: { status: "OFFICIAL" },
    }, f.ports)).outcome).toBe("HOLD");
    expect(f.ports.runTransaction).not.toHaveBeenCalled();
  });

  it("C/D: updates only one exact target ID and audits once across retries", async () => {
    const f = fixture();
    const first = await propagateFederationOfficialBracketCore(input, f.ports);
    expect(first.outcome).toBe("PROPAGATED");
    expect(f.patches).toEqual([{ homeTeamId: "home-participant" }]);
    expect(f.audits.size).toBe(1);
    expect([...f.audits.values()][0]).toMatchObject({
      action: "BRACKET_PROPAGATED", sourceMatchId: "source", targetMatchId: "target",
      targetSlot: "home", winnerParticipantId: "home-participant", sourceConfirmationKey: key,
    });
    const retry = await propagateFederationOfficialBracketCore(input, f.ports);
    expect(retry.outcome).toBe("NO_OP");
    expect(f.patches).toHaveLength(1);
    expect(f.audits.size).toBe(1);
  });

  it("E: an already identical slot is a no-op", async () => {
    const f = fixture();
    f.target.homeTeamId = "home-participant";
    expect((await propagateFederationOfficialBracketCore(input, f.ports)).outcome).toBe("NO_OP");
    expect(f.patches).toHaveLength(0);
    expect(f.audits.size).toBe(0);
  });

  it("F: an occupied conflicting slot is never overwritten and has one conflict audit", async () => {
    const f = fixture();
    f.target.homeTeamId = "wrong-participant";
    expect((await propagateFederationOfficialBracketCore(input, f.ports)).outcome).toBe("HOLD");
    expect((await propagateFederationOfficialBracketCore(input, f.ports)).outcome).toBe("HOLD");
    expect(f.target.homeTeamId).toBe("wrong-participant");
    expect(f.patches).toHaveLength(0);
    expect(f.audits.size).toBe(1);
    expect([...f.audits.values()][0].action).toBe("BRACKET_CONFLICT");
  });

  it("G/H: tied result and non-EXACT participant identity never propagate", async () => {
    const tied = fixture();
    tied.source.awayScore = 1;
    expect((await propagateFederationOfficialBracketCore(input, tied.ports)).outcome).toBe("HOLD");
    expect(tied.patches).toHaveLength(0);
    const ambiguous = fixture();
    ambiguous.participants["home-participant"].linkStatus = "DISPLAY_ONLY";
    expect((await propagateFederationOfficialBracketCore(input, ambiguous.ports)).outcome).toBe("HOLD");
    expect(ambiguous.patches).toHaveLength(0);
  });

  it("I: self, cyclic and reversed chronology dependencies never propagate", async () => {
    const self = fixture();
    self.source.nextMatchId = "target";
    self.target.homeSource.matchId = "target";
    expect((await propagateFederationOfficialBracketCore(input, self.ports)).outcome).toBe("HOLD");
    const cycle = fixture();
    cycle.source.homeSource = { matchId: "target", outcome: "WINNER", side: "home" };
    expect((await propagateFederationOfficialBracketCore(input, cycle.ports)).outcome).toBe("HOLD");
    const chronology = fixture();
    chronology.target.scheduledAt = "2026-09-13T10:00:00Z";
    expect((await propagateFederationOfficialBracketCore(input, chronology.ports)).outcome).toBe("HOLD");
    expect(self.patches).toHaveLength(0);
    expect(cycle.patches).toHaveLength(0);
    expect(chronology.patches).toHaveLength(0);
  });

  it("holds duplicate target candidates and a missing RESULT_OFFICIAL audit", async () => {
    const f = fixture();
    const duplicate = { ...f.target, id: "target2" };
    f.tx.getMatches.mockResolvedValueOnce([f.source, f.target, duplicate]);
    expect((await propagateFederationOfficialBracketCore(input, f.ports)).outcome).toBe("HOLD");
    const noAudit = fixture();
    noAudit.tx.getOfficialAudit.mockResolvedValueOnce(null);
    expect((await propagateFederationOfficialBracketCore(input, noAudit.ports)).outcome).toBe("HOLD");
  });

  it("pure selector identifies only the explicit single WINNER source slot", () => {
    const f = fixture();
    const result = selectBracketTarget(f.source as never, [f.source, f.target] as never);
    expect("target" in result && result.target.id).toBe("target");
  });
});
