/**
 * Vision v6-5 — map uid / playerId / memberId / trackId to a single lookup
 */

import type { Playmaker, PlayerFii } from "@/lib/vision/visionTypes";
import type {
  PlayerIdentityRef,
  ResolvedPlayerIdentity,
} from "@/lib/vision/playerIntelligenceTypes";

function norm(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

/** Normalize and merge partial identity inputs (uid → playerId priority for growth paths) */
export function resolvePlayerIdentity(input: PlayerIdentityRef): ResolvedPlayerIdentity {
  const teamId = input.teamId.trim();
  const playerId = input.playerId.trim();
  const uid = norm(input.uid);
  const memberId = norm(input.memberId);
  const trackId = norm(input.trackId);

  return {
    teamId,
    playerId: playerId || uid || memberId || "",
    uid: uid ?? (playerId === uid ? playerId : uid),
    memberId: memberId ?? (playerId !== uid ? undefined : memberId),
    trackId,
    displayName: undefined,
  };
}

/** Lookup keys for Vision FII / playmaker matching */
export function visionLookupKeys(identity: ResolvedPlayerIdentity): {
  playerId?: string;
  trackId?: string;
} {
  return {
    playerId: norm(identity.playerId) ?? norm(identity.uid),
    trackId: norm(identity.trackId),
  };
}

export function findPlayerFiiEntry(
  entries: PlayerFii[],
  identity: ResolvedPlayerIdentity
): PlayerFii | null {
  const { playerId, trackId } = visionLookupKeys(identity);
  if (playerId) {
    const byId = entries.find((e) => e.playerId === playerId);
    if (byId) return byId;
    const byUid = entries.find((e) => e.playerId === identity.uid);
    if (byUid) return byUid;
  }
  if (trackId) {
    const byTrack = entries.find((e) => e.trackId === trackId);
    if (byTrack) return byTrack;
  }
  return null;
}

export function isIdentityPlaymaker(
  playmaker: Playmaker | null | undefined,
  identity: ResolvedPlayerIdentity
): boolean {
  if (!playmaker) return false;
  const { playerId, trackId } = visionLookupKeys(identity);
  if (playerId && playmaker.playerId === playerId) return true;
  if (playerId && playmaker.playerId === identity.uid) return true;
  if (trackId && playmaker.trackId === trackId) return true;
  if (playmaker.name && identity.displayName) {
    return playmaker.name.trim().toLowerCase() === identity.displayName.trim().toLowerCase();
  }
  return false;
}

/** Optional: memberId often equals members doc id; playerId may equal auth uid */
export function mergeIdentityWithMember(
  base: ResolvedPlayerIdentity,
  member: { memberDocumentId?: string; uid?: string; displayName?: string }
): ResolvedPlayerIdentity {
  return resolvePlayerIdentity({
    teamId: base.teamId,
    playerId: base.playerId,
    uid: norm(member.uid) ?? base.uid,
    memberId: norm(member.memberDocumentId) ?? base.memberId,
    trackId: base.trackId,
  });
}
