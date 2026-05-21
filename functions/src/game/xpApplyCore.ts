/**
 * users.xp / gameProgression / 리더보드 일괄 반영 (배지 없음)
 */
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { XP_POLICY, levelFromTotalXp, type XpAwardSource } from "../config/xpPolicy";
import { computeGameXpAllowance } from "./xpCapAllowance";
import { applyWeeklyXpLeaderboardInTransaction } from "./weeklyXpLeaderboard";

export type ApplyXpDeltaResult = {
  nextProgXp: number;
  nextProgLevel: number;
  xpApplied: number;
  xpRequested: number;
};

export async function applyXpDeltaInTransaction(
  db: Firestore,
  tx: Transaction,
  uid: string,
  deltaXp: number,
  source: XpAwardSource,
  opts?: {
    accuracyBump?: number;
    now?: Date;
    /**
     * 시즌 보상 클레임 등 — 일·주간 캡·users.gameXpCap 미반영,
     * 주간 리더보드에도 포함하지 않음(이번 주 경쟁 점수와 분리).
     */
    bypassGameXpCap?: boolean;
  }
): Promise<ApplyXpDeltaResult> {
  const requested = Math.max(0, Math.floor(Number(deltaXp) || 0));
  if (requested <= 0) {
    const progressionRef = db.doc(`users/${uid}/gameProgression/summary`);
    const progressionSnap = await tx.get(progressionRef);
    const px = progressionSnap.exists ? Number(progressionSnap.data()?.totalXp ?? 0) || 0 : 0;
    return { nextProgXp: px, nextProgLevel: levelFromTotalXp(px), xpApplied: 0, xpRequested: 0 };
  }

  const userRef = db.doc(`users/${uid}`);
  const progressionRef = db.doc(`users/${uid}/gameProgression/summary`);
  const leaderboardRef = db.doc(`gameLeaderboards/totalXp/entries/${uid}`);

  const userSnap = await tx.get(userRef);
  const progressionSnap = await tx.get(progressionRef);

  const now = opts?.now ?? new Date();

  let gain: number;
  let reqRounded: number;
  let gameXpCapMerge: Record<string, unknown> | undefined;

  if (opts?.bypassGameXpCap) {
    reqRounded = requested;
    const capMax = XP_POLICY.SEASON_SETTLEMENT.MAX_BONUS_XP_PER_CLAIM;
    gain = Math.max(0, Math.min(requested, capMax));
    gameXpCapMerge = undefined;
  } else {
    const outcome = computeGameXpAllowance(
      userSnap.exists ? (userSnap.data() as Record<string, unknown>) : undefined,
      requested,
      source,
      now
    );
    gain = outcome.allowed;
    reqRounded = outcome.requested;
    gameXpCapMerge = { gameXpCap: outcome.gameXpCap };
  }

  if (gain <= 0) {
    if (gameXpCapMerge) {
      tx.set(userRef, { ...gameXpCapMerge, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    const prevUserXp = userSnap.exists ? Number(userSnap.data()?.xp ?? 0) || 0 : 0;
    const progressionXp = progressionSnap.exists
      ? Number(progressionSnap.data()?.totalXp ?? 0) || 0
      : prevUserXp;
    return {
      nextProgXp: progressionXp,
      nextProgLevel: levelFromTotalXp(progressionXp),
      xpApplied: 0,
      xpRequested: reqRounded,
    };
  }

  const prevUserXp = userSnap.exists ? Number(userSnap.data()?.xp ?? 0) || 0 : 0;
  const nextUserXp = prevUserXp + gain;
  const nextUserLevel = levelFromTotalXp(nextUserXp);

  const userPayload: Record<string, unknown> = {
    xp: nextUserXp,
    level: nextUserLevel,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (gameXpCapMerge) Object.assign(userPayload, gameXpCapMerge);
  tx.set(userRef, userPayload, { merge: true });

  const prevProgXp = progressionSnap.exists ? Number(progressionSnap.data()?.totalXp ?? 0) || 0 : prevUserXp;
  const nextProgXp = prevProgXp + gain;
  const nextProgLevel = levelFromTotalXp(nextProgXp);
  const prevStats = (progressionSnap.data()?.stats as Record<string, number> | undefined) ?? {};
  const bump = typeof opts?.accuracyBump === "number" && Number.isFinite(opts.accuracyBump) ? opts.accuracyBump : 0;

  tx.set(
    progressionRef,
    {
      schemaVersion: 1,
      totalXp: nextProgXp,
      level: nextProgLevel,
      stats: {
        accuracy: Math.min(100, (prevStats.accuracy ?? 0) + bump),
        power: prevStats.power ?? 0,
        stamina: prevStats.stamina ?? 0,
        speed: prevStats.speed ?? 0,
      },
      lastEventAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const displayName =
    userSnap.exists && typeof userSnap.data()?.displayName === "string"
      ? userSnap.data()?.displayName
      : undefined;

  tx.set(
    leaderboardRef,
    {
      schemaVersion: 1,
      boardId: "totalXp",
      uid,
      score: nextProgXp,
      level: nextProgLevel,
      displayName: displayName ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (!opts?.bypassGameXpCap) {
    await applyWeeklyXpLeaderboardInTransaction(db, tx, uid, gain, userSnap, now, {
      gameLevel: nextProgLevel,
    });
  }

  return { nextProgXp, nextProgLevel, xpApplied: gain, xpRequested: reqRounded };
}
