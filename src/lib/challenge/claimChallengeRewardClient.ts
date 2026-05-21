import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { functions } from "@/lib/firebase";

export type ClaimChallengeRewardOutcome =
  | "granted"
  | "blocked_not_best"
  | "blocked_cap"
  | "blocked_duplicate"
  | "blocked_no_avatar"
  | "blocked_invalid_submission";

export type ClaimChallengeRewardResponse = {
  ok: boolean;
  outcome: ClaimChallengeRewardOutcome;
  deltaXp?: number;
  newXp?: number;
  newLevel?: number;
};

/**
 * 제출 직후 서버가 역대 최고·일일 cap·멱등을 검증하고 XP를 지급합니다. (UTC·Callable 전용)
 */
export async function claimChallengeRewardForSubmission(
  submissionId: string,
): Promise<ClaimChallengeRewardResponse> {
  const fn = httpsCallable<{ submissionId: string }, ClaimChallengeRewardResponse>(
    functions,
    "claimChallengeReward",
  );
  const res = await fn({ submissionId });
  return res.data;
}

/** Callable은 성공 HTTP로 `{ ok:false, outcome }`를 줄 수 있으므로 throw와 분리해 UI만 처리 */
export function notifyChallengeRewardClaim(reward: ClaimChallengeRewardResponse): void {
  switch (reward.outcome) {
    case "granted":
      if (reward.deltaXp != null) {
        toast.message(`역대 최고를 넘겼어요. +${reward.deltaXp} XP`);
      }
      break;
    case "blocked_not_best":
      toast.message("이번 점수는 역대 최고를 넘지 않아 보상은 없어요. (동점 포함)");
      break;
    case "blocked_cap":
      toast.message("오늘(UTC) 받을 수 있는 챌린지 보상 횟수에 도달했어요. (PK·드리블 합산 최대 2회)");
      break;
    case "blocked_duplicate":
      toast.message("이미 처리된 제출이에요.");
      break;
    case "blocked_no_avatar":
      toast.message("아바타가 없어 XP를 지급하지 못했어요. 프로필에서 아바타를 만든 뒤 다시 시도해 주세요.");
      break;
    case "blocked_invalid_submission":
      toast.message("보상을 적용할 수 없는 제출이에요.");
      break;
    default:
      break;
  }
}
