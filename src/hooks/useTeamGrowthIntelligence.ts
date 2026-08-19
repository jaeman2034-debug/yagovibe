import { useEffect, useState } from "react";
import { loadTeamGrowthIntelligenceView } from "@/lib/ai-growth/loadTeamGrowthIntelligenceView";
import type {
  TeamGrowthIntelligenceEmptyReason,
  TeamGrowthIntelligenceView,
} from "@/lib/ai-growth/teamGrowthIntelligenceViewTypes";

export type { TeamGrowthIntelligenceView, TeamGrowthIntelligenceEmptyReason };

/** Sprint E-1 — 코치 팀 성장 인텔리전스 */
export function useTeamGrowthIntelligence(
  teamId: string | undefined,
  teamName: string
): {
  data: TeamGrowthIntelligenceView | null;
  loading: boolean;
  emptyReason: TeamGrowthIntelligenceEmptyReason | null;
} {
  const [data, setData] = useState<TeamGrowthIntelligenceView | null>(null);
  const [loading, setLoading] = useState(Boolean(teamId?.trim()));
  const [emptyReason, setEmptyReason] = useState<TeamGrowthIntelligenceEmptyReason | null>(null);

  useEffect(() => {
    const tid = teamId?.trim();
    if (!tid) {
      setData(null);
      setEmptyReason("no_roster");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const result = await loadTeamGrowthIntelligenceView(tid, teamName);
      if (cancelled) return;
      setData(result.view);
      setEmptyReason(result.emptyReason);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId, teamName]);

  return { data, loading, emptyReason };
}
