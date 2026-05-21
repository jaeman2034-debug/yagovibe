/**
 * ✅ COMMIT 17: 이상 탐지 로직
 * Z-score 기반 이상 탐지
 */

export interface Baseline {
  avg: number;
  std: number;
}

export interface AnomalyResult {
  level: "critical" | "warning";
  z: number;
}

export function detectAnomaly(input: { value: number; baseline: Baseline }): AnomalyResult | null {
  if (input.baseline.std === 0) return null;

  const z = (input.value - input.baseline.avg) / input.baseline.std;

  if (Math.abs(z) >= 3) {
    return { level: "critical", z };
  }

  if (Math.abs(z) >= 2) {
    return { level: "warning", z };
  }

  return null;
}

