import { useEffect, useState } from "react";
import { CHALLENGE_FRIEND_SCORE_QUERY_LIMIT } from "@/lib/challenge/constants";
import { fetchBestScoreForUser } from "@/services/challengeService";

export type FriendBestRow = { uid: string; best: number | null };

/**
 * PR-9 / PR-10B: 지정 `challengeId`에 대한 내 최고점 + 수락 친구 peer별 최고점.
 */
export function useChallengeBestScores(
  challengeId: string,
  myUid: string | undefined,
  isAnonymous: boolean | undefined,
  peerUids: string[],
  peersLoading: boolean,
  refreshNonce = 0,
) {
  const [myBest, setMyBest] = useState<number | null>(null);
  const [friendRows, setFriendRows] = useState<FriendBestRow[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [scoresError, setScoresError] = useState(false);

  useEffect(() => {
    if (!myUid || isAnonymous) {
      setMyBest(null);
      setFriendRows([]);
      setScoresLoading(false);
      setScoresError(false);
      return;
    }

    if (peersLoading) {
      setScoresLoading(true);
      return;
    }

    let cancelled = false;

    (async () => {
      setScoresLoading(true);

      try {
        setScoresError(false);
        const mine = await fetchBestScoreForUser(challengeId, myUid);
        if (cancelled) return;

        const limitedPeers = peerUids.slice(0, CHALLENGE_FRIEND_SCORE_QUERY_LIMIT);
        const rows: FriendBestRow[] = await Promise.all(
          limitedPeers.map(async (uid) => ({
            uid,
            best: await fetchBestScoreForUser(challengeId, uid),
          })),
        );
        if (cancelled) return;

        setMyBest(mine);
        setFriendRows(rows);
      } catch {
        if (!cancelled) {
          setScoresError(true);
          setMyBest(null);
          setFriendRows([]);
        }
      } finally {
        if (!cancelled) {
          setScoresLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [challengeId, myUid, isAnonymous, peerUids, peersLoading, refreshNonce]);

  return { myBest, friendRows, scoresLoading, scoresError };
}
