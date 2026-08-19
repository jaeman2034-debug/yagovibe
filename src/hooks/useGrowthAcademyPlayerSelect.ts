import { useCallback, useEffect, useState } from "react";
import {
  academyRowToGrowthPlayer,
  type GrowthSelectedPlayer,
} from "@/lib/ai-growth/growthSelectedPlayer";
import { readAcademyPlayers } from "@/lib/team/academyPlayersRead";

export function useGrowthAcademyPlayerSelect(teamId: string | undefined) {
  const [players, setPlayers] = useState<GrowthSelectedPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!teamId?.trim()) {
      setPlayers([]);
      setSelectedPlayerId("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await readAcademyPlayers(teamId);
      const mapped = rows.map(academyRowToGrowthPlayer);
      setPlayers(mapped);
      setSelectedPlayerId((prev) => {
        if (prev && mapped.some((p) => p.playerId === prev)) return prev;
        return mapped[0]?.playerId ?? "";
      });
    } catch (e) {
      console.error("[useGrowthAcademyPlayerSelect]", e);
      setPlayers([]);
      setSelectedPlayerId("");
      setError("아카데미 명단을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedPlayer =
    players.find((p) => p.playerId === selectedPlayerId) ?? null;

  return {
    players,
    selectedPlayer,
    selectedPlayerId,
    setSelectedPlayerId,
    loading,
    error,
    refresh,
  };
}
