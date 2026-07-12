/**
 * RC4-5 M5 — Vision platform route helpers (single navigation contract)
 */

import { buildParentChildGrowthProfilePath } from "@/lib/ai-growth/playerGrowthProfilePath";
import { teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";
import { VISION_PILOT_MATCH_ID } from "@/lib/vision/fiiSummaryLoader";

export type VisionPlatformSurface =
  | "team-hub"
  | "coach"
  | "match-detail"
  | "parent-report"
  | "player-profile"
  | "timeline"
  | "ops-dashboard";

/** Match Detail in-page Coach section (Decision Brief / FII) */
export const VISION_COACH_SECTION_ID = "vision-coach" as const;

/** Match Detail in-page Timeline section */
export const VISION_TIMELINE_SECTION_ID = "vision-timeline" as const;

/**
 * OBSERVATION (non-scope 2026-07-12): still uses Play Lounge via teamPlayEntryPath.
 * Separate navigation semantics review — do not change in Vision tab routing fix.
 */
export function visionTeamHubPath(teamId: string, matchId?: string): string {
  return teamPlayEntryPath(teamId, matchId ? { matchId } : undefined);
}

/**
 * Coach Vision Report — Production SoT = Match Detail + Coach section hash.
 * Play Lounge (`/play`) is not a Coach Vision route.
 */
export function visionCoachDashboardPath(teamId: string, matchId: string): string {
  return `${visionMatchDetailPath(teamId, matchId)}#${VISION_COACH_SECTION_ID}`;
}

/** Match Detail (FII · tactical) */
export function visionMatchDetailPath(teamId: string, matchId: string): string {
  return `/teams/${encodeURIComponent(teamId)}/vision/match/${encodeURIComponent(matchId)}`;
}

/** Match Detail — Timeline 섹션 앵커 */
export function visionTimelinePath(teamId: string, matchId: string): string {
  return `${visionMatchDetailPath(teamId, matchId)}#${VISION_TIMELINE_SECTION_ID}`;
}

/** Parent Report (전용 페이지) — no /home/parent or /home/admin fallback */
export function visionParentReportPath(
  teamId: string,
  playerId: string,
  matchId?: string
): string {
  const base = `/home/parent/vision/report`;
  const params = new URLSearchParams({
    teamId,
    playerId,
    matchId: matchId?.trim() || VISION_PILOT_MATCH_ID,
  });
  return `${base}?${params.toString()}`;
}

/** Player Growth Profile + optional match context */
export function visionPlayerProfilePath(
  teamId: string,
  playerId: string,
  opts?: { matchId?: string; trackId?: string }
): string {
  const base = buildParentChildGrowthProfilePath(teamId, playerId);
  const params = new URLSearchParams();
  const mid = opts?.matchId?.trim();
  const tid = opts?.trackId?.trim();
  if (mid) params.set("matchId", mid);
  if (tid) params.set("trackId", tid);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Parent role home — not a Parent Vision Report route.
 * Do not use as VisionPlatformNav Parent fallback.
 */
export function visionParentHomePath(): string {
  return "/home/parent";
}

/** Pilot Operations Dashboard (read-only) */
export function visionOpsDashboardPath(teamId: string): string {
  return `/teams/${encodeURIComponent(teamId)}/vision/ops`;
}

/** Ranking/playerFii row → Parent Report subject (playerId preferred, else trackId) */
export function pickVisionNavPlayerId(
  ranking: Array<{ playerId?: string; trackId?: string }> | undefined | null
): string | undefined {
  if (!ranking?.length) return undefined;
  for (const row of ranking) {
    const id = row.playerId?.trim() || row.trackId?.trim();
    if (id) return id;
  }
  return undefined;
}

/**
 * Growth Profile / Player tab only — requires linked platform playerId.
 * Never use Vision trackId (e.g. P0100) — that causes access-denied on /home/parent/child/...
 */
export function pickVisionNavLinkedPlayerId(
  ranking: Array<{ playerId?: string; trackId?: string }> | undefined | null
): string | undefined {
  if (!ranking?.length) return undefined;
  for (const row of ranking) {
    const id = row.playerId?.trim();
    if (id && !isLikelyVisionTrackId(id)) return id;
  }
  return undefined;
}

/** Vision FII track labels like P0100 — not Auth/academy playerIds */
export function isLikelyVisionTrackId(id: string | undefined | null): boolean {
  const v = id?.trim() ?? "";
  return /^P\d{3,}$/i.test(v);
}

/** Resolve Match Detail nav surface from location.hash */
export function visionSurfaceFromHash(hash: string | undefined | null): VisionPlatformSurface | null {
  const h = (hash ?? "").replace(/^#/, "").trim();
  if (h === VISION_COACH_SECTION_ID) return "coach";
  if (h === VISION_TIMELINE_SECTION_ID) return "timeline";
  return null;
}

/** Scroll to in-page Vision section; returns true if element found */
export function scrollVisionSectionIntoView(sectionId: string, behavior: ScrollBehavior = "smooth"): boolean {
  const el = document.getElementById(sectionId);
  if (!el) return false;
  el.scrollIntoView({ behavior, block: "start" });
  return true;
}
