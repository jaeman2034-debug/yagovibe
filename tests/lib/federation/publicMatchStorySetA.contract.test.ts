import { buildPublicMatchStoryProjection } from "../../../functions/src/federation/buildPublicMatchStoryProjection";
import { planStoryPatch } from "../../../functions/src/federation/syncFederationPublicMatchStoryOnEventCore";
import type { CanonicalStoryEventInput } from "../../../functions/src/federation/publicMatchStoryTypes";

const event = (patch: Partial<CanonicalStoryEventInput> = {}): CanonicalStoryEventInput => ({
  eventId: "e1", type: "GOAL", status: "CONFIRMED", teamSide: "home", minute: 12,
  playerName: "홍길동", privacyState: "UNKNOWN", ...patch,
});

describe("Batch 1B story privacy and ownership", () => {
  it("includes only confirmed supported events with valid side, ID and minute", () => {
    const built = buildPublicMatchStoryProjection([event(), event({ eventId: "p", status: "PENDING" }),
      event({ eventId: "u", type: "NOTE" }), event({ eventId: "s", teamSide: "neutral" }),
      event({ eventId: "m", minute: -1 }), event({ eventId: "x", minute: "0" }), event({ eventId: "" })]);
    expect(built.publicStoryEvents).toHaveLength(1);
    expect(built.diagnostics.map(d => d.reason)).toEqual(expect.arrayContaining([
      "INVALID_STATUS", "UNSUPPORTED_TYPE", "INVALID_TEAM_SIDE", "INVALID_MINUTE", "INVALID_EVENT_ID"]));
  });

  it("sorts 0, extra time and null minute, then stable event ID", () => {
    const rows = buildPublicMatchStoryProjection([event({ eventId: "z", minute: null }),
      event({ eventId: "b", minute: 90 }), event({ eventId: "a", minute: 90 }),
      event({ eventId: "zero", minute: 0 })]).publicStoryEvents;
    expect(rows.map(r => r.eventId)).toEqual(["zero", "a", "b", "z"]);
    expect(rows[3].publicSafeText).toBe("홈팀 득점");
  });

  it("dedupes same ID and excludes a conflicting duplicate", () => {
    expect(buildPublicMatchStoryProjection([event(), event()]).publicStoryEvents).toHaveLength(1);
    const conflict = buildPublicMatchStoryProjection([event(), event({ minute: 13 })]);
    expect(conflict.publicStoryEvents).toEqual([]);
    expect(conflict.diagnostics).toContainEqual({ eventId: "e1", reason: "CONFLICTING_DUPLICATE_EVENT_ID" });
  });

  it("suppresses every name-derived character for MINOR and UNKNOWN", () => {
    for (const state of ["MINOR", "UNKNOWN"] as const) {
      const row = buildPublicMatchStoryProjection([event({ privacyState: state })]).publicStoryEvents[0];
      expect(row.maskedPlayerName).toBeNull();
      expect(row.publicSafeText).toBe("12분 홈팀 득점");
      expect(JSON.stringify(row)).not.toContain("홍");
    }
  });

  it("allows only adult short masking and fixed card wording", () => {
    const rows = buildPublicMatchStoryProjection([event({ privacyState: "ADULT" }),
      event({ eventId: "y", type: "YELLOW_CARD", teamSide: "away", playerName: "김철수" }),
      event({ eventId: "r", type: "RED_CARD", teamSide: "away", playerName: "이영희" })]).publicStoryEvents;
    expect(rows.map(r => r.publicSafeText)).toEqual(["12분 홈팀 홍OO 득점", "12분 원정팀 퇴장", "12분 원정팀 경고"]);
    expect(JSON.stringify(rows)).not.toContain("길동");
  });

  it("does not ingest raw free text and ignores hidden raw names in revision", () => {
    const a = buildPublicMatchStoryProjection([event({ playerName: "홍길동" })]);
    const b = buildPublicMatchStoryProjection([event({ playerName: "김철수" })]);
    expect(a.storyRevision).toBe(b.storyRevision);
    expect(JSON.stringify(a)).not.toContain("홍길동");
    expect(buildPublicMatchStoryProjection([event({ minute: 13 })]).storyRevision).not.toBe(a.storyRevision);
    expect(buildPublicMatchStoryProjection([]).storyRevision).toBe(buildPublicMatchStoryProjection([]).storyRevision);
  });

  it("plans only story fields, preserves same-revision no-op and missing public", () => {
    const built = buildPublicMatchStoryProjection([event()]);
    expect(planStoryPatch(null, built)).toBeNull();
    expect(planStoryPatch({ storyRevision: built.storyRevision }, built)).toBeNull();
    expect(Object.keys(planStoryPatch({ publicVisible: true }, built)!)).toEqual(["publicStoryEvents", "storyRevision"]);
    expect(planStoryPatch({ publicStoryEvents: built.publicStoryEvents }, built)).toBeNull();
    const empty = buildPublicMatchStoryProjection([]);
    expect(planStoryPatch({ publicStoryEvents: built.publicStoryEvents }, empty)?.publicStoryEvents).toEqual([]);
  });
});
