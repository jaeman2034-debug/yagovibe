import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useMyTeams } from "@/hooks/useMyTeams";
import { buildFederationDashboard } from "@/lib/ai-growth/federationDashboardEngine";
import type { FederationDashboardResult } from "@/lib/ai-growth/federationDashboardTypes";
import { buildFederationCoachBenchmark } from "@/lib/ai-growth/federationCoachBenchmarkEngine";
import type { FederationCoachBenchmarkResult } from "@/lib/ai-growth/federationCoachBenchmarkTypes";
import { buildFederationOperationsBenchmark } from "@/lib/ai-growth/federationOperationsBenchmarkEngine";
import type { FederationOperationsBenchmarkResult } from "@/lib/ai-growth/federationOperationsBenchmarkTypes";
import { buildFederationRiskIntelligence } from "@/lib/ai-growth/federationRiskIntelligenceEngine";
import type { FederationRiskIntelligenceResult } from "@/lib/ai-growth/federationRiskIntelligenceTypes";
import {
  loadFederationIntelligenceSnapshots,
  resolveOperatedAcademyTeams,
} from "@/lib/ai-growth/loadFederationIntelligenceInput";

export type FederationIntelligenceEmptyReason = "no_operated_academies" | "load_error";

export type FederationIntelligenceView = {
  dashboard: FederationDashboardResult;
  riskIntelligence: FederationRiskIntelligenceResult;
  coachBenchmark: FederationCoachBenchmarkResult;
  operationsBenchmark: FederationOperationsBenchmarkResult;
};

/** Sprint H-1 — Federation Intelligence (MVP H-1.1 Dashboard) */
export function useFederationIntelligence(): {
  data: FederationIntelligenceView | null;
  loading: boolean;
  emptyReason: FederationIntelligenceEmptyReason | null;
} {
  const { user } = useAuth();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [data, setData] = useState<FederationIntelligenceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [emptyReason, setEmptyReason] = useState<FederationIntelligenceEmptyReason | null>(
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

        const snapshots = await loadFederationIntelligenceSnapshots(
          user?.uid,
          teamMembers
        );

        const view: FederationIntelligenceView = {
          dashboard: buildFederationDashboard(snapshots),
          riskIntelligence: buildFederationRiskIntelligence(snapshots),
          coachBenchmark: buildFederationCoachBenchmark(snapshots),
          operationsBenchmark: buildFederationOperationsBenchmark(snapshots),
        };

        if (!cancelled) {
          setData(view);
          setEmptyReason(null);
        }
      } catch (error) {
        console.warn("[useFederationIntelligence]", error);
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
  }, [teamMembers, teamsLoading, user?.uid]);

  return { data, loading: teamsLoading || loading, emptyReason };
}
