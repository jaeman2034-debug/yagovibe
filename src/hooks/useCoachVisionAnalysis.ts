/**
 * Vision v6-4 / RC4-3 M3 — Firestore + fii_summary.json binding for Coach Dashboard
 */

import { useEffect, useState } from "react";
import { onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { buildCoachDashboardVisionView } from "@/lib/vision/coachDashboardVisionProvider";
import { buildCoachDashboardFromFiiSummary } from "@/lib/vision/fiiSummaryCoachProvider";
import {
  loadFiiSummaryPilotFixture,
  shouldUseFiiSummaryPilot,
} from "@/lib/vision/fiiSummaryLoader";
import {
  visionAnalysisCollectionRef,
  visionAnalysisToResult,
  type VisionAnalysisRecord,
} from "@/lib/vision/visionFirestore";
import { buildCoachDashboardFromVisionAnalysis } from "@/lib/vision/visionAnalysisCoachBridge";
import type { CoachDashboardVisionProviderView } from "@/lib/vision/visionTypes";

export type CoachVisionAnalysisState = {
  loading: boolean;
  error: string | null;
  view: CoachDashboardVisionProviderView | null;
  hasAnalysis: boolean;
  analysisId: string | null;
};

const IDLE: CoachVisionAnalysisState = {
  loading: false,
  error: null,
  view: null,
  hasAnalysis: false,
  analysisId: null,
};

function mapDocToRecord(id: string, data: Record<string, unknown>): VisionAnalysisRecord {
  return {
    ...(data as VisionAnalysisRecord),
    analysisId: id,
    createdAtMs: null,
  };
}

async function tryLoadFiiSummaryPilot(): Promise<CoachVisionAnalysisState> {
  const doc = await loadFiiSummaryPilotFixture();
  const view = buildCoachDashboardFromFiiSummary(doc);
  return {
    loading: false,
    error: null,
    view,
    hasAnalysis: true,
    analysisId: "fii-summary-pilot",
  };
}

export function useCoachVisionAnalysis(
  teamId: string | undefined,
  matchId: string | undefined,
  enabled = true
): CoachVisionAnalysisState {
  const [state, setState] = useState<CoachVisionAnalysisState>(IDLE);

  useEffect(() => {
    const tid = teamId?.trim();
    const mid = matchId?.trim();
    if (!enabled || !tid || !mid) {
      setState(IDLE);
      return;
    }

    setState({ loading: true, error: null, view: null, hasAnalysis: false, analysisId: null });

    const col = visionAnalysisCollectionRef(tid, mid);
    const q = query(col, orderBy("createdAt", "desc"), limit(1));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const first = snap.docs[0];
        if (first) {
          try {
            const record = mapDocToRecord(first.id, first.data() as Record<string, unknown>);
            // Brain Wiring: prefer fii_summary / coachInsights (coachDecisionBrief)
            // over vision_result-only view which omits the decision brief card.
            const wired = buildCoachDashboardFromVisionAnalysis(record);
            const view =
              wired ?? buildCoachDashboardVisionView(visionAnalysisToResult(record));
            setState({
              loading: false,
              error: null,
              view,
              hasAnalysis: true,
              analysisId: first.id,
            });
          } catch (e) {
            const message =
              e instanceof Error ? e.message : "Vision 분석을 불러오지 못했습니다.";
            setState({
              loading: false,
              error: message,
              view: null,
              hasAnalysis: false,
              analysisId: null,
            });
          }
          return;
        }

        if (!shouldUseFiiSummaryPilot(mid)) {
          setState({
            loading: false,
            error: null,
            view: null,
            hasAnalysis: false,
            analysisId: null,
          });
          return;
        }

        void tryLoadFiiSummaryPilot()
          .then((pilotState) => setState(pilotState))
          .catch((e) => {
            const message =
              e instanceof Error ? e.message : "FII summary를 불러오지 못했습니다.";
            setState({
              loading: false,
              error: message,
              view: null,
              hasAnalysis: false,
              analysisId: null,
            });
          });
      },
      (e) => {
        const message = e instanceof Error ? e.message : "Vision 분석을 불러오지 못했습니다.";
        if (shouldUseFiiSummaryPilot(mid)) {
          void tryLoadFiiSummaryPilot()
            .then((pilotState) => setState(pilotState))
            .catch(() => {
              setState({
                loading: false,
                error: message,
                view: null,
                hasAnalysis: false,
                analysisId: null,
              });
            });
          return;
        }
        setState({
          loading: false,
          error: message,
          view: null,
          hasAnalysis: false,
          analysisId: null,
        });
      }
    );

    return () => unsub();
  }, [teamId, matchId, enabled]);

  return state;
}
