import type { TeamPlayHudRevealDetail } from "@/lib/team/teamPlayHudEvents";
import type { MiniShot3DResult } from "@/lib/team/miniShot3d";

/** 미니 슛 1회 — 연출용 XP 플로트만 (Firestore EXP와 별개, MVP 범위 밖) */
export function buildTeamPlayHudRevealFromMiniShot(result: MiniShot3DResult): TeamPlayHudRevealDetail {
  const xpGainRecent = result.goal ? (result.perfect ? 18 : 12) : 4;
  const recentMatchLine = result.goal
    ? result.perfect
      ? "⚡ 미니 슛 — 퍼펙트!"
      : "⚽ 미니 슛 — 골!"
    : "⌁ 미니 슛 — 시도 완료";
  return {
    xpGainRecent,
    recentMatchLine,
  };
}
