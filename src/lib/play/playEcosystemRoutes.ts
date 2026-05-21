/**
 * 플레이 생태계 URL — 팀 라운지 vs 실제 게임 씬 분리
 *
 * /teams/:teamId/play     팀 스코프 프리로비(플레이 라운지)
 * /playground             운동장(미니게임·챌린지 허브)
 * /game                   즉시 플레이 (큐 자동 입장 → 세션)
 * /matchmaking            매치 큐 (모드·상세 UI)
 * /game/session/:id       라이브 세션
 */

import { teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";

/** @alias teamPlayEntryPath — 팀 공개 페이지 CTA 목적지 */
export function teamPlayLobbyPath(teamId: string, opts?: { matchId?: string }): string {
  return teamPlayEntryPath(teamId, opts);
}

export function playgroundPath(): string {
  return "/playground";
}

export function matchmakingPath(): string {
  return "/matchmaking";
}

/** 홈 CTA · 북마크 — 큐 자동 입장 후 라이브 세션으로 이동 */
export function instantPlayPath(): string {
  return "/game";
}

/** RTDB/북마크에 `/game/session/uuid` 형태로 들어온 값 정리 */
export function normalizeGameSessionId(sessionId: string): string {
  let id = sessionId.trim().replace(/^\/+/, "");
  const prefix = "game/session/";
  if (id.startsWith(prefix)) id = id.slice(prefix.length);
  return id.replace(/^\/+/, "").trim();
}

export function gameSessionPath(sessionId: string): string {
  const id = normalizeGameSessionId(sessionId);
  if (!id) return matchmakingPath();
  return `/game/session/${encodeURIComponent(id)}`;
}
