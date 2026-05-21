import { PK_CHALLENGE_TEMPLATE_ID } from "@/lib/challenge/constants";
import { useChallengeBestScores, type FriendBestRow } from "@/hooks/useChallengeBestScores";

export type { FriendBestRow };

/** PR-9A: PK 템플릿 전용 — `useChallengeBestScores` 래퍼 */
export function usePkChallengeBestScores(
  myUid: string | undefined,
  isAnonymous: boolean | undefined,
  peerUids: string[],
  peersLoading: boolean,
  refreshNonce = 0,
) {
  return useChallengeBestScores(
    PK_CHALLENGE_TEMPLATE_ID,
    myUid,
    isAnonymous,
    peerUids,
    peersLoading,
    refreshNonce,
  );
}
