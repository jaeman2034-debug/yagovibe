import { getAuth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { devError } from "@/lib/utils/dev";

type ClaimDailyRewardInput = {
  teamId: string;
  dailyId: string;
  rewardXp: number;
  rewardScore: number;
  accuracy?: number;
  sessionScore?: number;
};

type ClaimDailyRewardResult = {
  granted: boolean;
  streakDays: number;
  streakBonusXp: number;
  superBadgeGranted: boolean;
};

type ApplyGameProgressionEventResponse = {
  granted: boolean;
  streakDays: number;
  streakBonusXp: number;
  superBadgeGranted: boolean;
};

/** 데일리 보상 1회 지급 — 서버 Callable (진실 원천) */
export async function claimMiniShotDailyRewardOnce(input: ClaimDailyRewardInput): Promise<ClaimDailyRewardResult> {
  const auth = getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return { granted: false, streakDays: 0, streakBonusXp: 0, superBadgeGranted: false };

  const teamId = input.teamId.trim();
  const dailyId = input.dailyId.trim();
  if (!teamId || !dailyId) return { granted: false, streakDays: 0, streakBonusXp: 0, superBadgeGranted: false };

  try {
    const fn = httpsCallable(functions, "applyGameProgressionEvent");
    const res = await fn({
      source: "miniShotDaily" as const,
      teamId,
      dailyId,
      rewardXp: input.rewardXp,
      rewardScore: input.rewardScore,
      accuracy: input.accuracy,
      sessionScore: input.sessionScore,
    });
    const data = res.data as ApplyGameProgressionEventResponse;
    return {
      granted: !!data.granted,
      streakDays: Number(data.streakDays) || 0,
      streakBonusXp: Number(data.streakBonusXp) || 0,
      superBadgeGranted: !!data.superBadgeGranted,
    };
  } catch (e) {
    devError("claimMiniShotDailyRewardOnce(Callable) 실패:", e);
    return { granted: false, streakDays: 0, streakBonusXp: 0, superBadgeGranted: false };
  }
}
