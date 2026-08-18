import type { GrowthScoreSnapshot } from "@/lib/ai-growth/growthScore";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import {
  syncPlayerOvrFromGrowthSnapshot,
  type GrowthPipelineResult,
} from "@/lib/ai-growth/playerGrowthOvrService";

function computeWeeklyDeltaOvr(sessions: PlayerGrowthSessionDoc[]): number {
  const scored = sessions
    .filter((s) => (s.metrics.growthScore?.overall ?? 0) > 0)
    .sort((a, b) => b.generatedAt - a.generatedAt);
  if (scored.length < 2) return 0;
  return Math.round(scored[0]!.metrics.growthScore!.overall - scored[1]!.metrics.growthScore!.overall);
}

export type SyncPlayerGrowthAvatarAfterSessionResult = GrowthPipelineResult & {
  avatarDoc: PlayerGrowthAvatarDoc;
};

/** D-3 — Step5 저장 후 OVR → playerGrowthAvatar(Level) 동기화 */
export async function syncPlayerGrowthAvatarAfterSession(input: {
  teamId: string;
  playerName: string;
  playerId?: string;
  sessionId: string;
  snapshot: GrowthScoreSnapshot;
  sessions: PlayerGrowthSessionDoc[];
  snapshotBeforeSave?: PlayerGrowthAvatarDoc | null;
}): Promise<SyncPlayerGrowthAvatarAfterSessionResult> {
  const avatarExtras = {
    sessionCount: input.sessions.length,
    lastSessionId: input.sessionId,
    weeklyDeltaOvr: computeWeeklyDeltaOvr(input.sessions),
    snapshotBeforeSave: input.snapshotBeforeSave,
  };

  const pipeline = await syncPlayerOvrFromGrowthSnapshot({
    teamId: input.teamId,
    playerName: input.playerName,
    playerId: input.playerId,
    snapshot: input.snapshot,
    avatarExtras,
  });

  return { ...pipeline, avatarDoc: pipeline.avatarDoc };
}
