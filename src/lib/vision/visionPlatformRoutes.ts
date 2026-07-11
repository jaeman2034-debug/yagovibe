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

/** Team Play 라운지 — Coach Dashboard 진입 */
export function visionTeamHubPath(teamId: string, matchId?: string): string {
  return teamPlayEntryPath(teamId, matchId ? { matchId } : undefined);
}

/** Coach Dashboard (Play 탭 + matchId) */
export function visionCoachDashboardPath(teamId: string, matchId: string): string {
  return teamPlayEntryPath(teamId, { matchId });
}

/** Match Detail (FII · tactical) */
export function visionMatchDetailPath(teamId: string, matchId: string): string {
  return `/teams/${encodeURIComponent(teamId)}/vision/match/${encodeURIComponent(matchId)}`;
}

/** Match Detail — Timeline 섹션 앵커 */
export function visionTimelinePath(teamId: string, matchId: string): string {
  return `${visionMatchDetailPath(teamId, matchId)}#vision-timeline`;
}

/** Parent Report (전용 페이지) */
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

/** Parent Home */
export function visionParentHomePath(): string {
  return "/home/parent";
}

/** Pilot Operations Dashboard (read-only) */
export function visionOpsDashboardPath(teamId: string): string {
  return `/teams/${encodeURIComponent(teamId)}/vision/ops`;
}
