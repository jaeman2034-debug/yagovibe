import { doc, getDoc, setDoc, type Timestamp } from "firebase/firestore";
import type { GrowthScoreSnapshot } from "@/lib/ai-growth/growthScore";
import { playerIdFromName, resolveGrowthPlayerIdForSession } from "@/lib/ai-growth/growthPlayerId";
import {
  buildOvrDocFromStats,
  statsFromGrowthSnapshot,
} from "@/lib/ai-growth/ovrEngine";
import {
  PLAYER_GROWTH_OVR_SCHEMA_VERSION,
  type PlayerGrowthOvrDoc,
} from "@/lib/ai-growth/playerGrowthOvrTypes";
import type { DimensionDeltaRank } from "@/lib/ai-growth/growthReportDimensions";
import {
  applySeasonDimensionDeltas,
  defaultOvrBundle,
  ovrBundleFromProfile,
} from "@/lib/ai-growth/ovrEngine";
import { mirrorPlayerGrowthToAvatar, type MirrorGrowthToAvatarResult } from "@/lib/ai-growth/mirrorGrowthToAvatar";
import { syncPlayerGrowthAvatarFromOvr } from "@/lib/ai-growth/playerGrowthAvatarService";
import type { GrowthLevelUpEvent } from "@/lib/ai-growth/growthAvatarLevelUp";
import type { GrowthBadgeUnlockEvent } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { db } from "@/lib/firebase";

export type GrowthPipelineResult = {
  ovrDoc: PlayerGrowthOvrDoc;
  avatarDoc: PlayerGrowthAvatarDoc;
  avatarMirror: MirrorGrowthToAvatarResult;
  levelUpEvent: GrowthLevelUpEvent | null;
  badgeUnlockEvent: GrowthBadgeUnlockEvent | null;
};

async function finalizeGrowthPipeline(
  teamId: string,
  playerName: string,
  ovrDoc: PlayerGrowthOvrDoc,
  avatarExtras?: {
    sessionCount?: number;
    lastSessionId?: string;
    weeklyDeltaOvr?: number;
    snapshotBeforeSave?: PlayerGrowthAvatarDoc | null;
  }
): Promise<GrowthPipelineResult> {
  await savePlayerGrowthOvr(teamId, ovrDoc);
  const { avatarDoc, levelUpEvent, badgeUnlockEvent } = await syncPlayerGrowthAvatarFromOvr(
    teamId,
    ovrDoc,
    avatarExtras
  );
  let avatarMirror: MirrorGrowthToAvatarResult;
  try {
    avatarMirror = await mirrorPlayerGrowthToAvatar({
      teamId,
      playerName,
      growthAvatar: avatarDoc,
    });
  } catch (error) {
    console.warn("[finalizeGrowthPipeline] avatars/{uid} mirror failed (avatar computed locally)", error);
    avatarMirror = {
      mirrored: false,
      targetUid: null,
      path: "skipped",
      message:
        error instanceof Error
          ? `Play Avatar 미러 실패: ${error.message}`
          : "Play Avatar 미러 실패",
    };
  }
  return { ovrDoc, avatarDoc, avatarMirror, levelUpEvent, badgeUnlockEvent };
}

function ovrDocRef(teamId: string, playerId: string) {
  return doc(db, "teams", teamId, "playerGrowthOvr", playerId);
}

function toMillis(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as Timestamp).toMillis === "function") {
    return (v as Timestamp).toMillis();
  }
  return null;
}

export function resolveGrowthPlayerId(playerName: string): string {
  return playerIdFromName(playerName);
}

export async function loadPlayerGrowthOvr(
  teamId: string,
  playerName: string,
  playerIdOverride?: string
): Promise<PlayerGrowthOvrDoc | null> {
  const playerId = resolveGrowthPlayerIdForSession({
    playerId: playerIdOverride,
    displayName: playerName,
  });
  let snap;
  try {
    snap = await getDoc(ovrDocRef(teamId, playerId));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code.includes("permission-denied")) return null;
    throw error;
  }
  if (!snap.exists()) return null;

  const data = snap.data() as Record<string, unknown>;
  const updatedAt = toMillis(data.updatedAt);
  if (updatedAt === null) return null;

  return {
    schemaVersion: PLAYER_GROWTH_OVR_SCHEMA_VERSION,
    playerId: String(data.playerId ?? playerId),
    playerName: String(data.playerName ?? playerName),
    ovr: typeof data.ovr === "number" ? Math.round(data.ovr) : 0,
    vision: typeof data.vision === "number" ? Math.round(data.vision) : 0,
    pressure: typeof data.pressure === "number" ? Math.round(data.pressure) : 0,
    recovery: typeof data.recovery === "number" ? Math.round(data.recovery) : 0,
    lastSeason: typeof data.lastSeason === "string" ? data.lastSeason : null,
    lastAppliedAt: toMillis(data.lastAppliedAt),
    updatedAt,
    source:
      data.source === "season_apply" ||
      data.source === "session_sync" ||
      data.source === "bootstrap" ||
      data.source === "cv_promotion"
        ? data.source
        : "bootstrap",
  };
}

export async function savePlayerGrowthOvr(
  teamId: string,
  ovrDoc: PlayerGrowthOvrDoc
): Promise<void> {
  await setDoc(
    ovrDocRef(teamId, ovrDoc.playerId),
    {
      ...ovrDoc,
      schemaVersion: PLAYER_GROWTH_OVR_SCHEMA_VERSION,
      teamId,
    },
    { merge: true }
  );
}

export async function syncPlayerOvrFromGrowthSnapshot(input: {
  teamId: string;
  playerName: string;
  playerId?: string;
  snapshot: GrowthScoreSnapshot;
  avatarExtras?: {
    sessionCount?: number;
    lastSessionId?: string;
    weeklyDeltaOvr?: number;
    snapshotBeforeSave?: PlayerGrowthAvatarDoc | null;
  };
}): Promise<GrowthPipelineResult> {
  const stats = statsFromGrowthSnapshot(input.snapshot);
  if (!stats) {
    throw new Error("Growth Score에 관찰된 축이 없어 OVR을 계산할 수 없습니다.");
  }

  const playerId = resolveGrowthPlayerIdForSession({
    playerId: input.playerId,
    displayName: input.playerName,
  });
  const ovrDoc = buildOvrDocFromStats({
    playerId,
    playerName: input.playerName,
    stats,
    source: "session_sync",
  });

  return finalizeGrowthPipeline(input.teamId, input.playerName, ovrDoc, input.avatarExtras);
}

export async function applySeasonOvrFromDeltas(input: {
  teamId: string;
  playerName: string;
  playerId?: string;
  seasonId: string;
  rankedDeltas: DimensionDeltaRank[];
  currentProfile: PlayerGrowthOvrDoc | null;
}): Promise<GrowthPipelineResult> {
  if (!input.rankedDeltas.length) {
    throw new Error("시즌 OVR 반영에 필요한 성장 축 데이터가 없습니다.");
  }

  const playerId = resolveGrowthPlayerIdForSession({
    playerId: input.playerId,
    displayName: input.playerName,
  });
  const base = input.currentProfile
    ? ovrBundleFromProfile(input.currentProfile)
    : defaultOvrBundle();

  const { next } = applySeasonDimensionDeltas(base, input.rankedDeltas);

  const ovrDoc = buildOvrDocFromStats({
    playerId,
    playerName: input.playerName,
    stats: { vision: next.vision, pressure: next.pressure, recovery: next.recovery },
    source: "season_apply",
    lastSeason: input.seasonId,
  });
  ovrDoc.lastAppliedAt = Date.now();

  return finalizeGrowthPipeline(input.teamId, input.playerName, ovrDoc);
}
