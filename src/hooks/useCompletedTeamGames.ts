import { useCallback, useEffect, useState } from "react";
import { getTeamGames } from "@/services/teamGameService";
import type { TeamGame } from "@/types/teamGame";

export function useCompletedTeamGames(teamId: string | undefined, limit = 25) {
  const [games, setGames] = useState<TeamGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!teamId?.trim()) {
      setGames([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const list = await getTeamGames(teamId, {
        status: "completed",
        gameType: "all",
        limit,
      });
      setGames(list.filter((g) => g.status === "completed"));
      setError(null);
    } catch (e) {
      setGames([]);
      setError(e instanceof Error ? e : new Error("경기 목록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, [teamId, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { games, loading, error, reload };
}
