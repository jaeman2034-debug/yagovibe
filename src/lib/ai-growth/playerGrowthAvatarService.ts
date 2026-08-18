import { doc, getDoc, type Timestamp } from "firebase/firestore";
import {
  buildPlayerGrowthAvatarFromOvr,
  normalizeGrowthBadgeIds,
} from "@/lib/ai-growth/avatarGrowthEngine";
import { ovrToGrowthLevel } from "@/lib/ai-growth/growthAvatarLevel";
import {
  applyLevelUpFieldsToAvatar,
  buildLevelUpEvent,
  readGrowthAvatarNumber,
  type GrowthLevelUpEvent,
} from "@/lib/ai-growth/growthAvatarLevelUp";
import {
  applyBadgeUnlockFieldsToAvatar,
  buildBadgeUnlockEvent,
  type GrowthBadgeUnlockEvent,
} from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import {
  applyOvrMilestoneFieldsToAvatar,
  buildOvrMilestoneEvent,
  type GrowthOvrMilestoneEvent,
} from "@/lib/ai-growth/growthAvatarOvrMilestone";
import type { PlayerGrowthOvrDoc } from "@/lib/ai-growth/playerGrowthOvrTypes";
import {
  PLAYER_GROWTH_AVATAR_SCHEMA_VERSION,
  type AvatarTier,
  type PlayerGrowthAvatarDoc,
} from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { resolveGrowthPlayerIdForSession } from "@/lib/ai-growth/growthPlayerId";
import { db } from "@/lib/firebase";

function avatarDocRef(teamId: string, playerId: string) {
  return doc(db, "teams", teamId, "playerGrowthAvatar", playerId);
}

function toMillis(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "toMillis" in v && typeof (v as Timestamp).toMillis === "function") {
    return (v as Timestamp).toMillis();
  }
  return null;
}

const VALID_TIERS = new Set<AvatarTier>(["starter", "bronze", "silver", "gold", "elite"]);

export async function loadPlayerGrowthAvatarByPlayerId(
  teamId: string,
  playerId: string
): Promise<PlayerGrowthAvatarDoc | null> {
  const snap = await getDoc(avatarDocRef(teamId, playerId));
  if (!snap.exists()) return null;
  return parseAvatarDoc(snap.id, playerId, snap.data() as Record<string, unknown>);
}

function parseAvatarDoc(
  docId: string,
  fallbackPlayerId: string,
  data: Record<string, unknown>
): PlayerGrowthAvatarDoc | null {
  const updatedAt = toMillis(data.updatedAt);
  if (updatedAt === null) return null;

  const tierRaw = String(data.tier ?? "starter");
  const tier = VALID_TIERS.has(tierRaw as AvatarTier) ? (tierRaw as AvatarTier) : "starter";

  const badges = Array.isArray(data.badges) ? normalizeGrowthBadgeIds(data.badges as string[]) : [];

  const syncedFromOvrAt = toMillis(data.syncedFromOvrAt);
  const ovr = typeof data.ovr === "number" ? Math.round(data.ovr) : 0;
  const vision =
    typeof data.vision === "number"
      ? Math.round(data.vision)
      : typeof data.visionScan === "number"
        ? Math.round(data.visionScan)
        : 0;
  const pressure =
    typeof data.pressure === "number"
      ? Math.round(data.pressure)
      : typeof data.pressureResistance === "number"
        ? Math.round(data.pressureResistance)
        : 0;
  const recovery =
    typeof data.recovery === "number"
      ? Math.round(data.recovery)
      : typeof data.recoverySpeed === "number"
        ? Math.round(data.recoverySpeed)
        : 0;
  const levelRaw = readGrowthAvatarNumber(data.level) ?? ovrToGrowthLevel(ovr);

  return {
    schemaVersion: PLAYER_GROWTH_AVATAR_SCHEMA_VERSION,
    playerId: String(data.playerId ?? fallbackPlayerId ?? docId),
    playerName: String(data.playerName ?? ""),
    level: levelRaw,
    ovr,
    vision,
    pressure,
    recovery,
    visionScan: vision,
    pressureResistance: pressure,
    recoverySpeed: recovery,
    tier,
    badges,
    ...(typeof data.sessionCount === "number" ? { sessionCount: data.sessionCount } : {}),
    ...(typeof data.lastSessionId === "string" ? { lastSessionId: data.lastSessionId } : {}),
    ...(typeof data.weeklyDeltaOvr === "number" ? { weeklyDeltaOvr: data.weeklyDeltaOvr } : {}),
    ...(typeof data.lastLevel === "number" ? { lastLevel: Math.round(data.lastLevel) } : {}),
    ...(typeof data.lastLevelUpAt === "number" ? { lastLevelUpAt: Math.round(data.lastLevelUpAt) } : {}),
    ...(typeof data.lastOvr === "number" ? { lastOvr: Math.round(data.lastOvr) } : {}),
    ...(typeof data.lastBadgeUnlockAt === "number"
      ? { lastBadgeUnlockAt: Math.round(data.lastBadgeUnlockAt) }
      : {}),
    ...(Array.isArray(data.lastUnlockedBadges)
      ? { lastUnlockedBadges: normalizeGrowthBadgeIds(data.lastUnlockedBadges as string[]) }
      : {}),
    ...(typeof data.lastOvrMilestoneAt === "number"
      ? { lastOvrMilestoneAt: Math.round(data.lastOvrMilestoneAt) }
      : {}),
    ...(typeof data.lastOvrMilestoneFrom === "number"
      ? { lastOvrMilestoneFrom: Math.round(data.lastOvrMilestoneFrom) }
      : {}),
    ...(typeof data.lastOvrMilestoneTo === "number"
      ? { lastOvrMilestoneTo: Math.round(data.lastOvrMilestoneTo) }
      : {}),
    updatedAt,
    syncedFromOvrAt: syncedFromOvrAt ?? updatedAt,
  };
}

export type SyncPlayerGrowthAvatarResult = {
  avatarDoc: PlayerGrowthAvatarDoc;
  levelUpEvent: GrowthLevelUpEvent | null;
  badgeUnlockEvent: GrowthBadgeUnlockEvent | null;
  ovrMilestoneEvent: GrowthOvrMilestoneEvent | null;
};

export async function loadPlayerGrowthAvatar(
  teamId: string,
  playerName: string,
  playerIdOverride?: string
): Promise<PlayerGrowthAvatarDoc | null> {
  const playerId = resolveGrowthPlayerIdForSession({
    playerId: playerIdOverride,
    displayName: playerName,
  });
  let snap;
  try {
    snap = await getDoc(avatarDocRef(teamId, playerId));
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    if (code.includes("permission-denied")) return null;
    throw error;
  }
  if (!snap.exists()) return null;
  return parseAvatarDoc(snap.id, playerId, {
    ...(snap.data() as Record<string, unknown>),
    playerName: (snap.data() as Record<string, unknown>).playerName ?? playerName,
  });
}

/** Academy roster 등 — playerId 기준 일괄 조회 */
export async function loadPlayerGrowthAvatarsByPlayerIds(
  teamId: string,
  playerIds: string[]
): Promise<Record<string, PlayerGrowthAvatarDoc>> {
  const unique = [...new Set(playerIds.map((id) => id.trim()).filter(Boolean))];
  const out: Record<string, PlayerGrowthAvatarDoc> = {};

  await Promise.all(
    unique.map(async (playerId) => {
      const doc = await loadPlayerGrowthAvatarByPlayerId(teamId, playerId);
      if (doc) out[playerId] = doc;
    })
  );

  return out;
}

/** 멤버 목록 등 — displayName 기준 일괄 조회 */
export async function loadPlayerGrowthAvatarsByNames(
  teamId: string,
  playerNames: string[]
): Promise<Record<string, PlayerGrowthAvatarDoc>> {
  const unique = [...new Set(playerNames.map((n) => n.trim()).filter(Boolean))];
  const out: Record<string, PlayerGrowthAvatarDoc> = {};

  await Promise.all(
    unique.map(async (name) => {
      const doc = await loadPlayerGrowthAvatar(teamId, name);
      if (doc) out[name] = doc;
    })
  );

  return out;
}

/** GAP-1 Option A — playerGrowthAvatar is CF-only; client must not persist. */
export async function savePlayerGrowthAvatar(
  teamId: string,
  avatarDoc: PlayerGrowthAvatarDoc
): Promise<void> {
  console.warn("[savePlayerGrowthAvatar] skipped — CF-only SoT (GAP-1 Option A)", {
    teamId,
    playerId: avatarDoc.playerId,
  });
}

/** OVR 프로필 → Avatar 티어·배지·Level 동기화 */
export async function syncPlayerGrowthAvatarFromOvr(
  teamId: string,
  ovrDoc: PlayerGrowthOvrDoc,
  extras?: {
    sessionCount?: number;
    lastSessionId?: string;
    weeklyDeltaOvr?: number;
    /** Step5 persist 직전 스냅샷 — CF 선행 쓰기 레이스 방지 */
    snapshotBeforeSave?: PlayerGrowthAvatarDoc | null;
  }
): Promise<SyncPlayerGrowthAvatarResult> {
  const existing = await loadPlayerGrowthAvatarByPlayerId(teamId, ovrDoc.playerId);
  const base = buildPlayerGrowthAvatarFromOvr(ovrDoc, extras);
  const levelUpOpts = { snapshotBeforeSave: extras?.snapshotBeforeSave };
  const withLevel = applyLevelUpFieldsToAvatar(existing, base, levelUpOpts);
  const withBadges = applyBadgeUnlockFieldsToAvatar(existing, withLevel);
  const avatarDoc = applyOvrMilestoneFieldsToAvatar(existing, withBadges, levelUpOpts);
  const levelUpEvent = buildLevelUpEvent(existing, avatarDoc, ovrDoc.playerName, levelUpOpts);
  const badgeUnlockEvent = buildBadgeUnlockEvent(existing, avatarDoc, ovrDoc.playerName);
  const ovrMilestoneEvent = buildOvrMilestoneEvent(existing, avatarDoc, ovrDoc.playerName, levelUpOpts);
  // GAP-1 Option A: avatar SoT persisted by CF (onPlayerGrowthHistoryAvatarSync · promotion · rollback).
  return { avatarDoc, levelUpEvent, badgeUnlockEvent, ovrMilestoneEvent };
}
