import { useEffect, useState } from "react";
import {
  DEFAULT_TEAM_FEE_POLICY,
  fetchTeamFeePolicy,
} from "@/lib/team/teamFeePolicy";
import type { TeamFeePolicy } from "@/types/teamFeePolicy";

export function useTeamFeePolicy(teamId: string | undefined) {
  const [policy, setPolicy] = useState<TeamFeePolicy>(DEFAULT_TEAM_FEE_POLICY);
  const [loading, setLoading] = useState(Boolean(teamId));

  useEffect(() => {
    if (!teamId) {
      setPolicy(DEFAULT_TEAM_FEE_POLICY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchTeamFeePolicy(teamId)
      .then((p) => {
        if (!cancelled) setPolicy(p);
      })
      .catch(() => {
        if (!cancelled) setPolicy(DEFAULT_TEAM_FEE_POLICY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return { policy, loading };
}
