/** PM Week2 — operational vs algorithm failure split (read-only dashboard). */

export type VisionFailureCategory = "operational" | "algorithm" | "input_quality" | null;

export function classifyVisionRunFailure(run: {
  status?: string;
  gevStatus?: string | null;
  gevEventCount?: number | null;
  visionReadinessGevAllowed?: boolean | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  gevReason?: string | null;
}): VisionFailureCategory {
  const err = String(run.errorMessage ?? run.errorCode ?? run.gevReason ?? "").toLowerCase();
  const operationalPatterns = [
    "command failed",
    "externally-managed-environment",
    "whisper_language",
    "python3 /app",
    "no module named",
    "enoent",
    "econnrefused",
    "timeout",
    "worker unavailable",
  ];

  if (run.status === "failed" && operationalPatterns.some((p) => err.includes(p))) {
    return "operational";
  }
  if (run.status === "failed") return "operational";
  if (run.status === "completed" && run.gevStatus === "failed") {
    return err.includes("no gev events") ? "algorithm" : "operational";
  }
  if (
    run.status === "completed" &&
    (run.gevStatus === "empty" || Number(run.gevEventCount ?? 0) === 0) &&
    run.visionReadinessGevAllowed === false
  ) {
    return "input_quality";
  }
  if (
    run.status === "completed" &&
    (run.gevStatus === "empty" || Number(run.gevEventCount ?? 0) === 0)
  ) {
    return "algorithm";
  }
  return null;
}

export function isProductionRun(run: Parameters<typeof classifyVisionRunFailure>[0]): boolean {
  return classifyVisionRunFailure(run) !== "operational";
}
