import type { CvSignalDto, CvSignalKey } from "@/lib/academy/academyCvGrowthLinksTypes";
import { formatCvMetric } from "@/components/ai-growth/cv/cvRunUiHelpers";

const J5_SIGNAL_LABELS: Record<string, string> = {
  VISIBILITY_RATIO: "Visibility Ratio",
  SESSION_CONFIDENCE: "Session Confidence",
  MOVEMENT_CONSISTENCY: "Movement Consistency",
  TRACKING_COVERAGE: "Tracking Coverage",
};

export const J5_PREVIEW_SIGNAL_KEYS: CvSignalKey[] = [
  "VISIBILITY_RATIO",
  "SESSION_CONFIDENCE",
  "MOVEMENT_CONSISTENCY",
  "TRACKING_COVERAGE",
];

export function cvSignalLabel(key: CvSignalKey | string): string {
  return J5_SIGNAL_LABELS[key] ?? key;
}

export function findCvSignal(
  signals: CvSignalDto[],
  key: CvSignalKey
): CvSignalDto | undefined {
  return signals.find((s) => s.key === key);
}

export function formatCvSignalValue(signal: CvSignalDto | undefined): string {
  if (!signal) return "—";
  if (signal.unit === "index_0_100") return String(Math.round(signal.value));
  if (signal.unit === "count") return String(Math.round(signal.value));
  return formatCvMetric(signal.value);
}
