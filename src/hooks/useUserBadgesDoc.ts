import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UnlockedBadgeEntry, UserBadgesDoc, UserBadgeXpStats } from "@/types/badge";

function asTimestamp(v: unknown): Timestamp | undefined {
  if (v && typeof v === "object" && "seconds" in (v as object)) {
    return v as Timestamp;
  }
  return undefined;
}

function asUserBadgesDoc(data: Record<string, unknown> | undefined): UserBadgesDoc | null {
  if (!data || typeof data !== "object") return null;
  if (typeof data.schemaVersion !== "number" || typeof data.uid !== "string") return null;
  const rawUnlocked = data.unlocked;
  const unlocked: Record<string, UnlockedBadgeEntry> = {};
  if (rawUnlocked && typeof rawUnlocked === "object" && !Array.isArray(rawUnlocked)) {
    for (const [badgeId, meta] of Object.entries(rawUnlocked)) {
      if (!meta || typeof meta !== "object") continue;
      const m = meta as Record<string, unknown>;
      const unlockedAt = asTimestamp(m.unlockedAt);
      if (!unlockedAt) continue;
      unlocked[badgeId] = {
        unlockedAt,
        source: typeof m.source === "string" ? m.source : undefined,
        context: m.context && typeof m.context === "object" ? (m.context as Record<string, unknown>) : undefined,
      };
    }
  }

  const rs = data.stats as Record<string, unknown> | undefined;
  const stats: UserBadgeXpStats = {
    membershipXpGrants: Math.max(0, Math.floor(Number(rs?.membershipXpGrants) || 0)),
    rsvpXpGrants: Math.max(0, Math.floor(Number(rs?.rsvpXpGrants) || 0)),
    inviteXpGrants: Math.max(0, Math.floor(Number(rs?.inviteXpGrants) || 0)),
    activityXpGrants: Math.max(0, Math.floor(Number(rs?.activityXpGrants) || 0)),
  };

  const updatedAt = asTimestamp(data.updatedAt) ?? Timestamp.now();

  return {
    schemaVersion: data.schemaVersion,
    uid: data.uid,
    stats,
    unlocked,
    updatedAt,
  };
}

/**
 * `badges/{uid}` 실시간 구독 (Functions가 해제 시 UI 반영).
 */
export function useUserBadgesDoc(uid: string | undefined, isAnonymous: boolean | undefined) {
  const [badgesDoc, setBadgesDoc] = useState<UserBadgesDoc | null>(null);
  const [loading, setLoading] = useState(Boolean(uid && !isAnonymous));

  useEffect(() => {
    if (!uid || isAnonymous) {
      setBadgesDoc(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, "badges", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setBadgesDoc(snap.exists() ? asUserBadgesDoc(snap.data() as Record<string, unknown>) : null);
        setLoading(false);
      },
      () => {
        setBadgesDoc(null);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid, isAnonymous]);

  return { badgesDoc, loading };
}
