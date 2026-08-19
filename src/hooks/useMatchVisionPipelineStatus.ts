/**
 * Vision v6-7 — realtime match pipeline status (visionMatchIndex)
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  mapVisionIndexToUiStatus,
  type VisionMatchIndexDoc,
  type VisionPipelineUiStatus,
} from "@/lib/vision/visionRunTypes";

export type MatchVisionPipelineState = {
  loading: boolean;
  uiStatus: VisionPipelineUiStatus;
  index: VisionMatchIndexDoc | null;
};

const IDLE: MatchVisionPipelineState = {
  loading: false,
  uiStatus: "none",
  index: null,
};

export function useMatchVisionPipelineStatus(
  teamId: string | undefined,
  matchId: string | undefined,
  enabled = true
): MatchVisionPipelineState {
  const [state, setState] = useState<MatchVisionPipelineState>({
    ...IDLE,
    loading: true,
  });

  useEffect(() => {
    const tid = teamId?.trim();
    const mid = matchId?.trim();
    if (!enabled || !tid || !mid) {
      setState(IDLE);
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    const ref = doc(db, "teams", tid, "visionMatchIndex", mid);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ loading: false, uiStatus: "none", index: null });
          return;
        }
        const data = snap.data();
        const statusRaw = typeof data.status === "string" ? data.status : "none";
        const index: VisionMatchIndexDoc = {
          teamId: tid,
          matchId: mid,
          mediaId: typeof data.mediaId === "string" ? data.mediaId : null,
          runId: typeof data.runId === "string" ? data.runId : null,
          analysisId: typeof data.analysisId === "string" ? data.analysisId : null,
          latestRunId:
            typeof data.latestRunId === "string"
              ? data.latestRunId
              : typeof data.runId === "string"
                ? data.runId
                : null,
          latestAnalysisId:
            typeof data.latestAnalysisId === "string"
              ? data.latestAnalysisId
              : typeof data.analysisId === "string"
                ? data.analysisId
                : null,
          hasVision: data.hasVision === true,
          progress: typeof data.progress === "number" ? data.progress : null,
          status: statusRaw as VisionMatchIndexDoc["status"],
          pipelineStep:
            typeof data.pipelineStep === "string"
              ? (data.pipelineStep as VisionMatchIndexDoc["pipelineStep"])
              : null,
          productionPreset:
            typeof data.productionPreset === "string" ? data.productionPreset : null,
          errorCode: typeof data.errorCode === "string" ? data.errorCode : null,
          errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : null,
        };
        setState({
          loading: false,
          uiStatus: mapVisionIndexToUiStatus(statusRaw),
          index,
        });
      },
      () => {
        setState({ loading: false, uiStatus: "none", index: null });
      }
    );

    return () => unsub();
  }, [teamId, matchId, enabled]);

  return state;
}
