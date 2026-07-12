/**
 * Vision platform route helpers — tab routing regression coverage
 */

jest.mock("@/lib/vision/fiiSummaryLoader", () => ({
  VISION_PILOT_MATCH_ID: "vision-pilot-pass01-clip-002",
}));

import {
  pickVisionNavPlayerId,
  pickVisionNavLinkedPlayerId,
  isLikelyVisionTrackId,
  visionCoachDashboardPath,
  visionMatchDetailPath,
  visionParentHomePath,
  visionParentReportPath,
  visionSurfaceFromHash,
  visionTeamHubPath,
  visionTimelinePath,
  VISION_COACH_SECTION_ID,
  VISION_TIMELINE_SECTION_ID,
} from "@/lib/vision/visionPlatformRoutes";

const TEAM = "D7TUZaOtfxdBc4P0lQLx";
const MATCH = "vision-pilot-pass01-clip-002";

describe("visionPlatformRoutes — Match Detail tab mapping", () => {
  it("Coach maps to Match Detail + #vision-coach (not Play Lounge)", () => {
    const href = visionCoachDashboardPath(TEAM, MATCH);
    expect(href).toBe(
      `/teams/${encodeURIComponent(TEAM)}/vision/match/${encodeURIComponent(MATCH)}#${VISION_COACH_SECTION_ID}`
    );
    expect(href.includes("/play")).toBe(false);
    expect(href).toContain(`#${VISION_COACH_SECTION_ID}`);
  });

  it("Match Detail path has no play segment", () => {
    const href = visionMatchDetailPath(TEAM, MATCH);
    expect(href).toBe(
      `/teams/${encodeURIComponent(TEAM)}/vision/match/${encodeURIComponent(MATCH)}`
    );
    expect(href.includes("/play")).toBe(false);
  });

  it("Timeline uses Match Detail + #vision-timeline", () => {
    const href = visionTimelinePath(TEAM, MATCH);
    expect(href).toBe(`${visionMatchDetailPath(TEAM, MATCH)}#${VISION_TIMELINE_SECTION_ID}`);
  });

  it("Parent Report preserves teamId/playerId/matchId — no /home/parent bare path", () => {
    const href = visionParentReportPath(TEAM, "P0100", MATCH);
    expect(href.startsWith("/home/parent/vision/report?")).toBe(true);
    expect(href).toContain(`teamId=${TEAM}`);
    expect(href).toContain("playerId=P0100");
    expect(href).toContain(`matchId=${MATCH}`);
    expect(href).not.toBe(visionParentHomePath());
    expect(href.includes("/home/admin")).toBe(false);
  });

  it("pickVisionNavPlayerId prefers playerId then trackId", () => {
    expect(
      pickVisionNavPlayerId([{ trackId: "P0100", playerId: "player-ap-63d56190" }])
    ).toBe("player-ap-63d56190");
    expect(pickVisionNavPlayerId([{ trackId: "P0100" }])).toBe("P0100");
    expect(pickVisionNavPlayerId([])).toBeUndefined();
    expect(pickVisionNavPlayerId(null)).toBeUndefined();
  });

  it("pickVisionNavLinkedPlayerId never uses Vision trackId alone", () => {
    expect(pickVisionNavLinkedPlayerId([{ trackId: "P0100" }])).toBeUndefined();
    expect(
      pickVisionNavLinkedPlayerId([{ trackId: "P0100", playerId: "player-ap-63d56190" }])
    ).toBe("player-ap-63d56190");
    expect(isLikelyVisionTrackId("P0100")).toBe(true);
    expect(isLikelyVisionTrackId("player-ap-63d56190")).toBe(false);
  });

  it("visionSurfaceFromHash resolves coach/timeline", () => {
    expect(visionSurfaceFromHash("#vision-coach")).toBe("coach");
    expect(visionSurfaceFromHash("#vision-timeline")).toBe("timeline");
    expect(visionSurfaceFromHash("")).toBeNull();
    expect(visionSurfaceFromHash("#other")).toBeNull();
  });

  it("OBSERVATION: team hub still uses Play Lounge (out of this fix scope)", () => {
    const href = visionTeamHubPath(TEAM, MATCH);
    expect(href).toContain("/play");
    expect(href).toContain(`matchId=${encodeURIComponent(MATCH)}`);
  });
});
