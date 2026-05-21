import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import type { TeamPlayerStatsUI } from "@/types/teamPlayerStats";
import type { PlayMainPosition } from "@/utils/playerStats";
import {
  firestoreTeamPlayerStatsCollection,
  snapshotToTeamPlayerUi,
} from "@/services/teamPlayerStatsService";

/** 스냅샷 간단 검증 후 UI 모델 (서비스 calculate와 완전 일치 필요 시 재조회) */
export type TeamRankingsBuckets = Partial<Record<PlayMainPosition, TeamPlayerStatsUI[]>>;

export function useTeamPlayerRankings(teamId: string | undefined) {
  const [players, setPlayers] = useState<TeamPlayerStatsUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!teamId?.trim()) {
      setPlayers([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      firestoreTeamPlayerStatsCollection(teamId),
      (snap) => {
        const list = snap.docs.map((d) => snapshotToTeamPlayerUi(d.id, d.data())).sort((a, b) => b.ovr - a.ovr);
        setPlayers(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.warn("[useTeamPlayerRankings] 조회 실패:", err);
        setError(err as Error);
        setPlayers([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId]);

  const topPlayers = useMemo(() => players.slice(0, 25), [players]);

  const byPosition = useMemo(() => {
    const pos: TeamRankingsBuckets = { GK: [], DF: [], MF: [], FW: [] };
    for (const p of players) {
      const mp = p.mainPosition;
      if (mp === "GK" || mp === "DF" || mp === "MF" || mp === "FW") {
        pos[mp]?.push(p);
      }
    }
    (Object.keys(pos) as PlayMainPosition[]).forEach((k) => {
      pos[k]?.sort((a, b) => b.ovr - a.ovr);
    });
    return pos;
  }, [players]);

  return {
    players,
    topPlayers,
    byPosition,
    loading,
    error,
  };
}
