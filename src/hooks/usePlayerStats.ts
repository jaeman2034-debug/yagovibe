import { useMemo } from "react";
import { useTeamPlayerRankings } from "@/hooks/useTeamPlayerRankings";

/**
 * 내 플레이 카드만 필요할 때.
 * 같은 화면에서 `useTeamPlayerRankings`와 함께 쓰면 구독이 중복됩니다 — 한 번만 구독하고 `players.find` 권장.
 */
export function usePlayerStats(teamId: string | undefined, userId: string | undefined | null) {
  const { players, loading, error } = useTeamPlayerRankings(teamId);

  const myPlayer = useMemo(() => {
    const uid = typeof userId === "string" ? userId.trim() : "";
    if (!uid) return null;
    return players.find((p) => p.userId === uid) ?? null;
  }, [players, userId]);

  return { myPlayer, loading, error };
}
