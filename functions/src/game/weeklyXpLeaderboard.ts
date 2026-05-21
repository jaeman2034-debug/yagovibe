/**
 * 주간 시즌(ISO 서울 주차)별 weeklyXp 리더보드 — XP 단일 진입점에서만 갱신
 */
import type { DocumentSnapshot, Firestore, Transaction } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { tierFromWeeklyXp } from "../config/weeklyTierPolicy";
import { getCurrentWeeklySeasonId } from "./xpTimeKeys";

export function weeklySeasonBoardId(seasonId: string): string {
  return `weeklyXp_${seasonId}`;
}

function pickAvatarHint(data: Record<string, unknown>): string | undefined {
  const keys = ["avatarId", "photoAvatarId", "profileImageAssetId"];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

/**
 * 해당 주차 컬렉션에 이번 XP만큼 누적 반영합니다.
 */
export async function applyWeeklyXpLeaderboardInTransaction(
  db: Firestore,
  tx: Transaction,
  uid: string,
  xpGain: number,
  userSnap: DocumentSnapshot,
  now: Date,
  opts?: { gameLevel?: number }
): Promise<void> {
  const gain = Math.max(0, Math.floor(Number(xpGain) || 0));
  if (gain <= 0) return;

  const seasonId = getCurrentWeeklySeasonId(now);
  const boardId = weeklySeasonBoardId(seasonId);
  const weeklyRef = db.doc(`gameLeaderboards/${boardId}/entries/${uid}`);
  const weeklySnap = await tx.get(weeklyRef);

  const ud = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};

  let prevWeekly = 0;
  if (weeklySnap.exists) {
    const w = weeklySnap.data() ?? {};
    const docSeason = typeof w.seasonId === "string" ? w.seasonId : undefined;
    if (!docSeason || docSeason === seasonId) {
      prevWeekly =
        Number(w.score ?? w.xp ?? w.weeklyXp ?? 0) ||
        0;
      prevWeekly = Math.max(0, Math.floor(prevWeekly));
    }
  }

  const nextWeekly = prevWeekly + gain;
  const tier = tierFromWeeklyXp(nextWeekly);
  const displayName = typeof ud.displayName === "string" ? ud.displayName : null;
  const avatarId = pickAvatarHint(ud);

  const payload: Record<string, unknown> = {
    schemaVersion: 1,
    boardId,
    seasonId,
    seasonType: "weekly",
    uid,
    score: nextWeekly,
    xp: nextWeekly,
    tier,
    displayName,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (avatarId) payload.avatarId = avatarId;
  if (typeof opts?.gameLevel === "number" && Number.isFinite(opts.gameLevel)) {
    payload.level = Math.max(1, Math.floor(opts.gameLevel));
  }

  tx.set(weeklyRef, payload, { merge: true });
}
