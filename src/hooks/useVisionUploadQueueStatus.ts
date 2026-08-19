/**
 * RC5-2 — Vision Upload Queue realtime status
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { VisionUploadQueueDoc, VisionUploadQueueStatus } from "@/lib/vision/visionUploadQueueTypes";

export type VisionUploadQueueState = {
  loading: boolean;
  doc: VisionUploadQueueDoc | null;
};

const IDLE: VisionUploadQueueState = { loading: false, doc: null };

export function useVisionUploadQueueStatus(
  teamId: string | undefined,
  mediaId: string | undefined,
  enabled = true
): VisionUploadQueueState {
  const [state, setState] = useState<VisionUploadQueueState>({ ...IDLE, loading: true });

  useEffect(() => {
    const tid = teamId?.trim();
    const mid = mediaId?.trim();
    if (!enabled || !tid || !mid) {
      setState(IDLE);
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    const ref = doc(db, "teams", tid, "visionUploadQueue", mid);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ loading: false, doc: null });
          return;
        }
        const data = snap.data();
        const docOut: VisionUploadQueueDoc = {
          teamId: tid,
          mediaId: mid,
          matchId: typeof data.matchId === "string" ? data.matchId : null,
          storagePath: typeof data.storagePath === "string" ? data.storagePath : "",
          sizeBytes: typeof data.sizeBytes === "number" ? data.sizeBytes : 0,
          videoHash: typeof data.videoHash === "string" ? data.videoHash : "",
          idempotencyKey: typeof data.idempotencyKey === "string" ? data.idempotencyKey : "",
          status: (typeof data.status === "string"
            ? data.status
            : "queued") as VisionUploadQueueStatus,
          runId: typeof data.runId === "string" ? data.runId : null,
          analysisId: typeof data.analysisId === "string" ? data.analysisId : null,
          errorCode: typeof data.errorCode === "string" ? data.errorCode : null,
          errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : null,
        };
        setState({ loading: false, doc: docOut });
      },
      () => setState({ loading: false, doc: null })
    );

    return () => unsub();
  }, [teamId, mediaId, enabled]);

  return state;
}
