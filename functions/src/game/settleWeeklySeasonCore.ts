/**
 * 주간 시즌 정산 공용 로직 (Callable · Scheduler)
 */
import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getWeeklySeasonRewardSnapshotForTier } from "../config/weeklySeasonRewardPolicy";
import { tierFromWeeklyXp } from "../config/weeklyTierPolicy";
import { parseWeeklySeasonId, getWeeklySeasonBounds } from "./xpSeasonBounds";
import { weeklySeasonBoardId } from "./weeklyXpLeaderboard";

const BATCH_SIZE = 400;

export type SettleWeeklySeasonResponse = {
  ok: boolean;
  seasonId: string;
  resultCount: number;
  alreadySettled?: boolean;
};

export async function runWeeklySeasonSettlement(
  db: Firestore,
  seasonId: string,
  options: { now: Date; forceBeforeEnd: boolean }
): Promise<SettleWeeklySeasonResponse> {
  const trimmed = seasonId.trim();
  if (!parseWeeklySeasonId(trimmed)) {
    throw new HttpsError("invalid-argument", "유효하지 않은 seasonId 입니다.");
  }

  const bounds = getWeeklySeasonBounds(trimmed);
  if (!bounds) throw new HttpsError("failed-precondition", "시즌 구간 계산 실패");

  const now = options.now;
  if (!options.forceBeforeEnd && now.getTime() <= bounds.endAt.getTime()) {
    throw new HttpsError("failed-precondition", "아직 종료되지 않은 시즌은 정산할 수 없습니다.");
  }

  const seasonRef = db.doc(`gameSeasons/${trimmed}`);
  const existing = await seasonRef.get();
  if (existing.exists && String(existing.data()?.status ?? "") === "settled") {
    return {
      ok: true,
      seasonId: trimmed,
      resultCount: Number(existing.data()?.entryCount ?? 0),
      alreadySettled: true,
    };
  }

  const boardId = weeklySeasonBoardId(trimmed);
  const entriesCol = db.collection(`gameLeaderboards/${boardId}/entries`);

  await seasonRef.set(
    {
      schemaVersion: 1,
      seasonId: trimmed,
      type: "weekly",
      status: "settling",
      boardId,
      startAt: Timestamp.fromDate(bounds.startAt),
      endAt: Timestamp.fromDate(bounds.endAt),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  try {
    let rank = 0;
    let lastDoc: QueryDocumentSnapshot | null = null;
    let total = 0;

    for (;;) {
      let q = entriesCol.orderBy("score", "desc").limit(BATCH_SIZE);
      if (lastDoc) q = q.startAfter(lastDoc);

      const page = await q.get();
      if (page.empty) break;

      const batch = db.batch();
      for (const doc of page.docs) {
        rank += 1;
        const uidEntry = doc.id;
        const d = doc.data() ?? {};
        const weeklyXp = Math.max(0, Math.floor(Number(d.score ?? d.xp ?? d.weeklyXp ?? 0) || 0));
        const tier = tierFromWeeklyXp(weeklyXp);
        const rewards = getWeeklySeasonRewardSnapshotForTier(tier);
        const displayName = typeof d.displayName === "string" ? d.displayName : "";

        batch.set(db.doc(`gameSeasons/${trimmed}/results/${uidEntry}`), {
          schemaVersion: 1,
          seasonId: trimmed,
          uid: uidEntry,
          rank,
          weeklyXp,
          tier,
          bonusXp: rewards.bonusXp,
          badgeCodes: rewards.badgeCodes,
          rewardClaimed: false,
          displayName,
          leaderboardScoreAtSettle: weeklyXp,
          settledAt: FieldValue.serverTimestamp(),
        });
        total += 1;
      }

      await batch.commit();
      lastDoc = page.docs[page.docs.length - 1] ?? null;
      if (page.docs.length < BATCH_SIZE) break;
    }

    await seasonRef.set(
      {
        schemaVersion: 1,
        seasonId: trimmed,
        type: "weekly",
        status: "settled",
        boardId,
        startAt: Timestamp.fromDate(bounds.startAt),
        endAt: Timestamp.fromDate(bounds.endAt),
        entryCount: total,
        settledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { ok: true, seasonId: trimmed, resultCount: total };
  } catch (e: unknown) {
    logger.error("runWeeklySeasonSettlement failed", { seasonId: trimmed, e });
    throw new HttpsError("internal", "시즌 정산 처리에 실패했습니다.");
  }
}
