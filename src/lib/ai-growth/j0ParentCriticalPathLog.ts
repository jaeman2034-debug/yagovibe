/**
 * J0-P3 — Parent Experience critical path logging (I12 · read-only surfaces)
 */

export const J0_PARENT_CRITICAL_PATH_PREFIX = "[j0-parent-critical-path]";

export type J0ParentCriticalPathEvent =
  | "parent_home_load"
  | "narrative_render"
  | "timeline_render"
  | "hero_summary_render"
  | "weekly_digest_render"
  | "growth_notification_render"
  | "monthly_pdf_render"
  | "monthly_pdf_export";

export type J0ParentCriticalPathPhase = "start" | "success" | "error" | "empty";

export type J0ParentCorrelationKeys = {
  teamId?: string;
  playerId?: string;
  runId?: string;
  previewId?: string;
  auditId?: string;
};

export function logJ0ParentCriticalPath(
  event: J0ParentCriticalPathEvent,
  phase: J0ParentCriticalPathPhase,
  keys: J0ParentCorrelationKeys,
  extra?: Record<string, unknown>
): void {
  const payload = {
    event,
    phase,
    status: phase,
    ts: Date.now(),
    ...keys,
    ...extra,
  };
  if (phase === "error") {
    console.warn(J0_PARENT_CRITICAL_PATH_PREFIX, payload);
  } else {
    console.info(J0_PARENT_CRITICAL_PATH_PREFIX, payload);
  }
}
