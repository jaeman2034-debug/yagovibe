/**
 * RC5-4 — Pilot Beta Firestore hooks
 */

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { VISION_PILOT_BETA_CONFIG } from "@/lib/vision/visionPilotBetaConfig";
import type { VisionPilotOpsLogDoc, VisionPilotVocDoc } from "@/lib/vision/visionPilotBetaTypes";

export function useVisionPilotOpsLogs(teamId: string | undefined, max = 20) {
  const [logs, setLogs] = useState<VisionPilotOpsLogDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tid = teamId?.trim();
    if (!tid) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "teams", tid, VISION_PILOT_BETA_CONFIG.opsLogCollection),
      orderBy("recordedAt", "desc"),
      limit(max)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              teamId: tid,
              matchId: String(data.matchId ?? ""),
              mediaId: String(data.mediaId ?? ""),
              runId: String(data.runId ?? d.id),
              analysisId: typeof data.analysisId === "string" ? data.analysisId : null,
              success: data.success === true,
              idempotent: data.idempotent === true,
              pipelineElapsedMs:
                typeof data.pipelineElapsedMs === "number" ? data.pipelineElapsedMs : 0,
              startedFrom: String(data.startedFrom ?? ""),
              errorCode: typeof data.errorCode === "string" ? data.errorCode : null,
              errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : null,
              pipelineStep: typeof data.pipelineStep === "string" ? data.pipelineStep : null,
              productionPreset:
                typeof data.productionPreset === "string" ? data.productionPreset : null,
              recordedAt: data.recordedAt ?? null,
            };
          })
        );
        setLoading(false);
      },
      () => {
        setLogs([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, max]);

  return { logs, loading };
}

export function useVisionPilotVocEntries(teamId: string | undefined, matchId: string | undefined) {
  const [entries, setEntries] = useState<VisionPilotVocDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tid = teamId?.trim();
    const mid = matchId?.trim();
    if (!tid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "teams", tid, VISION_PILOT_BETA_CONFIG.vocCollection),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              persona: data.persona === "parent" ? ("parent" as const) : ("coach" as const),
              rating: typeof data.rating === "number" ? data.rating : 0,
              comment: String(data.comment ?? ""),
              matchId: String(data.matchId ?? ""),
              submittedBy: String(data.submittedBy ?? ""),
              createdAt: data.createdAt ?? null,
            };
          })
          .filter((e) => !mid || e.matchId === mid);
        setEntries(rows);
        setLoading(false);
      },
      () => {
        setEntries([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, matchId]);

  return { entries, loading };
}
