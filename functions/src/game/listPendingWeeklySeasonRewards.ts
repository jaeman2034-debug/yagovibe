/**
 * 미수령 주간 시즌 보상 목록 — 시즌 ID는 서버에서만 산출(클라 Date 계산 불필요)
 */
import { getFirestore } from "firebase-admin/firestore";
import type { DocumentReference, DocumentSnapshot } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getCurrentWeeklySeasonId } from "./xpTimeKeys";
import { parseWeeklySeasonId } from "./xpSeasonBounds";

const REGION = "asia-northeast3";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS_SCAN = 120;
const MAX_DISTINCT_SEASONS = 28;
const GET_ALL_CHUNK = 25;

function recentDistinctSeasonIds(now: Date): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const t0 = now.getTime();
  for (let d = 1; d <= MAX_DAYS_SCAN && out.length < MAX_DISTINCT_SEASONS; d++) {
    const id = getCurrentWeeklySeasonId(new Date(t0 - d * DAY_MS));
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function seasonSortKey(id: string): number {
  const p = parseWeeklySeasonId(id);
  if (!p) return 0;
  return p.weekYear * 100 + p.week;
}

async function getAllInChunks(db: ReturnType<typeof getFirestore>, refs: DocumentReference[]) {
  const snaps: DocumentSnapshot[] = [];
  for (let i = 0; i < refs.length; i += GET_ALL_CHUNK) {
    const chunk = refs.slice(i, i + GET_ALL_CHUNK);
    const part = await db.getAll(...chunk);
    snaps.push(...part);
  }
  return snaps;
}

export type PendingWeeklySeasonReward = {
  seasonId: string;
  rank: number;
  tier: string;
  weeklyXp: number;
  bonusXp: number;
  badgeCodes: string[];
};

export type ListPendingWeeklySeasonRewardsResponse = {
  pending: PendingWeeklySeasonReward[];
};

export const listPendingWeeklySeasonRewards = onCall(
  { region: REGION, cors: true, maxInstances: 30 },
  async (request): Promise<ListPendingWeeklySeasonRewardsResponse> => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const db = getFirestore();
    const seasonIds = recentDistinctSeasonIds(new Date());
    const refs = seasonIds.map((sid) => db.doc(`gameSeasons/${sid}/results/${uid}`));

    const snaps = await getAllInChunks(db, refs);
    const pending: PendingWeeklySeasonReward[] = [];

    for (const snap of snaps) {
      if (!snap.exists) continue;
      const d = snap.data() ?? {};
      if (d.rewardClaimed === true) continue;
      const sid = typeof d.seasonId === "string" ? d.seasonId : "";
      if (!sid || !parseWeeklySeasonId(sid)) continue;

      pending.push({
        seasonId: sid,
        rank: Math.max(0, Math.floor(Number(d.rank ?? 0))),
        tier: typeof d.tier === "string" ? d.tier : "",
        weeklyXp: Math.max(0, Math.floor(Number(d.weeklyXp ?? d.leaderboardScoreAtSettle ?? 0))),
        bonusXp: Math.max(0, Math.floor(Number(d.bonusXp ?? 0))),
        badgeCodes: Array.isArray(d.badgeCodes)
          ? d.badgeCodes.filter((b: unknown): b is string => typeof b === "string")
          : [],
      });
    }

    pending.sort((a, b) => seasonSortKey(b.seasonId) - seasonSortKey(a.seasonId));

    return { pending };
  }
);
