import type { MatchmakingMode } from "./types";

export function is1v1LiveSessionMode(mode: string | undefined): boolean {
  return mode === "1v1";
}

export function isTeamLiveSessionMode(mode: string | undefined): mode is "5v5" | "8v8" {
  return mode === "5v5" || mode === "8v8";
}

export function parseSessionMode(mode: string | undefined): MatchmakingMode | null {
  if (mode === "1v1" || mode === "5v5" || mode === "8v8") return mode;
  return null;
}

/** 현재 큐 UI 모드와 presence activeMatch 모드가 일치하는지 */
export function isActiveMatchForQueueMode(
  match: { mode?: string } | null | undefined,
  queueMode: MatchmakingMode,
): boolean {
  return Boolean(match && match.mode === queueMode);
}
