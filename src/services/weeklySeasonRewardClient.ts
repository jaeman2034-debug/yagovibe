import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type PendingWeeklySeasonReward = {
  seasonId: string;
  rank: number;
  tier: string;
  weeklyXp: number;
  bonusXp: number;
  badgeCodes: string[];
};

export async function fetchPendingWeeklySeasonRewards(): Promise<PendingWeeklySeasonReward[]> {
  const fn = httpsCallable<Record<string, never>, { pending: PendingWeeklySeasonReward[] }>(
    functions,
    "listPendingWeeklySeasonRewards"
  );
  const res = await fn({});
  return res.data.pending ?? [];
}

export async function claimWeeklySeasonReward(seasonId: string): Promise<{
  ok: boolean;
  bonusXpGranted: number;
  alreadyClaimed?: boolean;
}> {
  const fn = httpsCallable<
    { seasonId: string },
    { ok: boolean; bonusXpGranted: number; alreadyClaimed?: boolean }
  >(functions, "claimSeasonReward");
  const res = await fn({ seasonId });
  return res.data;
}
