/**
 * ✅ COMMIT 17-1: Silence 탐지 로직
 * 값이 0이거나 평균 대비 극단적으로 낮아지는 경우 감지
 */

export type SilenceResult =
  | { level: "warning" | "critical"; kind: "zero" | "drop"; ratio?: number }
  | null;

export interface Baseline {
  avg: number;
}

export function detectSilence(input: {
  value: number | null | undefined;
  baseline: Baseline;
  zeroIsCritical?: boolean; // 기본 true
  dropRatioWarn?: number; // 기본 0.3 (30%)
  dropRatioCritical?: number; // 기본 0.1 (10%)
}): SilenceResult {
  const {
    value,
    baseline,
    zeroIsCritical = true,
    dropRatioWarn = 0.3,
    dropRatioCritical = 0.1,
  } = input;

  // 1) 완전 침묵 (0 또는 null)
  if (value == null || value === 0) {
    return {
      level: zeroIsCritical ? "critical" : "warning",
      kind: "zero",
    };
  }

  if (!baseline?.avg || baseline.avg <= 0) return null;

  const ratio = value / baseline.avg;

  // 2) 급감 침묵
  if (ratio <= dropRatioCritical) {
    return { level: "critical", kind: "drop", ratio };
  }

  if (ratio <= dropRatioWarn) {
    return { level: "warning", kind: "drop", ratio };
  }

  return null;
}

