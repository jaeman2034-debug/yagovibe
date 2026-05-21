import { useCallback, useState } from "react";
import type { FederationBatchEnginePhase } from "@/services/federationBatchAutoBuild";

/** 플로팅 Progress·버튼 비활성화용 */
export type BatchAutoBuildProgress =
  | { phase: "idle" }
  | { phase: "generating"; done: number; total: number }
  | { phase: "composing" }
  | { phase: "saving" }
  | { phase: "done" }
  | { phase: "error"; message: string };

function mapEngineToUi(p: FederationBatchEnginePhase): BatchAutoBuildProgress {
  if (p.phase === "generating") {
    return { phase: "generating", done: p.done, total: p.total };
  }
  if (p.phase === "composing") return { phase: "composing" };
  return { phase: "saving" };
}

export function useFederationBatchAutoBuild(options?: {
  /** done 표시 후 자동으로 idle (ms). 0이면 비활성 */
  resetDoneAfterMs?: number;
}) {
  const resetDoneAfterMs = options?.resetDoneAfterMs ?? 2800;

  const [progress, setProgress] = useState<BatchAutoBuildProgress>({ phase: "idle" });

  const onEngineProgress = useCallback((p: FederationBatchEnginePhase) => {
    setProgress(mapEngineToUi(p));
  }, []);

  const markIdle = useCallback(() => setProgress({ phase: "idle" }), []);

  const markDone = useCallback(() => {
    setProgress({ phase: "done" });
    if (resetDoneAfterMs > 0) {
      window.setTimeout(() => setProgress({ phase: "idle" }), resetDoneAfterMs);
    }
  }, [resetDoneAfterMs]);

  const markError = useCallback((message: string) => {
    setProgress({ phase: "error", message });
  }, []);

  const isRunning =
    progress.phase !== "idle" &&
    progress.phase !== "done" &&
    progress.phase !== "error";

  return {
    progress,
    onEngineProgress,
    markIdle,
    markDone,
    markError,
    isRunning,
  };
}
