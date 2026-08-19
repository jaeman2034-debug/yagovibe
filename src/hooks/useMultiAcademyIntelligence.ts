import { useEffect, useState } from "react";
import { useMyTeams } from "@/hooks/useMyTeams";
import { buildMultiAcademyDashboard } from "@/lib/ai-growth/multiAcademyDashboardEngine";
import type { MultiAcademyDashboardResult } from "@/lib/ai-growth/multiAcademyDashboardTypes";
import {
  loadAcademyIntelligenceSnapshots,
  resolveOperatedAcademyTeams,
} from "@/lib/ai-growth/loadMultiAcademyDashboardInput";
import { buildMultiAcademyCoachBenchmark } from "@/lib/ai-growth/multiAcademyCoachBenchmarkEngine";
import type { MultiAcademyCoachBenchmarkResult } from "@/lib/ai-growth/multiAcademyCoachBenchmarkTypes";
import { buildMultiAcademyOperationsBenchmark } from "@/lib/ai-growth/multiAcademyOperationsBenchmarkEngine";
import type { MultiAcademyOperationsBenchmarkResult } from "@/lib/ai-growth/multiAcademyOperationsBenchmarkTypes";
import { buildMultiAcademyRiskIntelligence } from "@/lib/ai-growth/multiAcademyRiskIntelligenceEngine";
import type { MultiAcademyRiskIntelligenceResult } from "@/lib/ai-growth/multiAcademyRiskIntelligenceTypes";

export type MultiAcademyIntelligenceEmptyReason =
  | "no_operated_academies"
  | "load_error";

export type MultiAcademyIntelligenceView = {
  dashboard: MultiAcademyDashboardResult;
  riskIntelligence: MultiAcademyRiskIntelligenceResult;
  coachBenchmark: MultiAcademyCoachBenchmarkResult;
  operationsBenchmark: MultiAcademyOperationsBenchmarkResult;
};

/** Sprint G-1 — Multi Academy Intelligence (MVP A) */
export function useMultiAcademyIntelligence(): {
  data: MultiAcademyIntelligenceView | null;
  loading: boolean;
  emptyReason: MultiAcademyIntelligenceEmptyReason | null;
} {
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [data, setData] = useState<MultiAcademyIntelligenceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [emptyReason, setEmptyReason] = useState<MultiAcademyIntelligenceEmptyReason | null>(
    null
  );

  useEffect(() => {
    if (teamsLoading) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const operatedTeams = await resolveOperatedAcademyTeams(teamMembers);
        if (operatedTeams.length === 0) {
          if (!cancelled) {
            setData(null);
            setEmptyReason("no_operated_academies");
          }
          return;
        }

        const snapshots = await loadAcademyIntelligenceSnapshots(operatedTeams);
        const view: MultiAcademyIntelligenceView = {
          dashboard: buildMultiAcademyDashboard(snapshots),
          riskIntelligence: buildMultiAcademyRiskIntelligence(snapshots),
          coachBenchmark: buildMultiAcademyCoachBenchmark(snapshots),
          operationsBenchmark: buildMultiAcademyOperationsBenchmark(snapshots),
        };

        if (!cancelled) {
          setData(view);
          setEmptyReason(null);
        }
      } catch (error) {
        console.warn("[useMultiAcademyIntelligence]", error);
        if (!cancelled) {
          setData(null);
          setEmptyReason("load_error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamMembers, teamsLoading]);

  return { data, loading: teamsLoading || loading, emptyReason };
}
