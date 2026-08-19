/**
 * TRACK 8C Sprint 2 — stable experiment assignment.
 */
import { hashToBucket } from "@/lib/experiments/hash";
import type { ExperimentId, ExperimentVariant } from "@/lib/experiments/registry";

const ANON_SUBJECT_KEY = "yago:experiment_subject_id";

export function getAnonymousSubjectId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    let id = localStorage.getItem(ANON_SUBJECT_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `anon_${crypto.randomUUID()}`
          : `anon_${Date.now()}_${performance.now?.() ?? 0}`;
      localStorage.setItem(ANON_SUBJECT_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function resolveExperimentSubjectId(uid?: string | null): string | null {
  const id = uid?.trim();
  if (id) return id;
  return getAnonymousSubjectId();
}

/** 50/50 deterministic split. Last resort: control (A). */
export function assignExperimentVariant(
  experimentId: ExperimentId,
  uid?: string | null,
): ExperimentVariant {
  const subjectId = resolveExperimentSubjectId(uid);
  if (!subjectId) return "A";
  return hashToBucket(subjectId, experimentId) < 50 ? "A" : "B";
}
