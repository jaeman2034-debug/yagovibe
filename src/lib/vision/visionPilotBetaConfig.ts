/**
 * RC5-4 — Pilot Beta configuration (from repo data asset)
 */

import pilotRaw from "@/lib/vision/data/rc5_4_pilot_academy.json";
import { VISION_PILOT_MATCH_ID } from "@/lib/vision/fiiSummaryLoader";

export type VisionPilotAcademyConfig = {
  schemaVersion: string;
  phase: string;
  productionPreset: string;
  pilotMatchId: string;
  pilotClipId: string;
  academy: { name: string; labelKo: string };
  team: { teamId: string; label: string };
  roles: {
    coach: { label: string; uid: string };
    parent: { label: string; uid: string; playerId: string };
  };
  routes: Record<string, string>;
  opsLogCollection: string;
  vocCollection: string;
};

export const VISION_PILOT_BETA_CONFIG = pilotRaw as VisionPilotAcademyConfig;

export function resolvePilotMatchId(teamId: string, override?: string): string {
  return override?.trim() || VISION_PILOT_BETA_CONFIG.pilotMatchId || VISION_PILOT_MATCH_ID;
}

export function isPilotBetaTeam(teamId: string): boolean {
  const configured = VISION_PILOT_BETA_CONFIG.team.teamId;
  if (!configured || configured === "CONFIGURE_AT_OPS") return true;
  return teamId.trim() === configured;
}

export function buildPilotRoute(
  template: string,
  params: { teamId: string; matchId: string; playerId?: string }
): string {
  return template
    .replace("{teamId}", encodeURIComponent(params.teamId))
    .replace("{matchId}", encodeURIComponent(params.matchId))
    .replace("{playerId}", encodeURIComponent(params.playerId ?? ""));
}
