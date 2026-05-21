/**
 * ✅ COMMIT 17-2: Drift 감지 로직
 * 서서히 변하는 패턴 감지 (이동 평균의 기울기)
 */

export type DriftResult = { level: "warning" | "critical"; slope: number } | null;

/**
 * @param values: 과거 → 현재 순서 (예: 최근 7~14일)
 */
export function detectDrift(
  values: number[],
  opts?: {
    warnSlope?: number;
    criticalSlope?: number;
  }
): DriftResult {
  if (values.length < 5) return null;

  const warn = opts?.warnSlope ?? 0.05; // 하루당 5% 변화
  const critical = opts?.criticalSlope ?? 0.1; // 하루당 10%

  // 단순 선형 회귀 기울기
  const n = values.length;
  const xs = [...Array(n).keys()];
  const avgX = xs.reduce((a, b) => a + b, 0) / n;
  const avgY = values.reduce((a, b) => a + b, 0) / n;

  const num = xs.reduce((s, x, i) => s + (x - avgX) * (values[i] - avgY), 0);
  const den = xs.reduce((s, x) => s + (x - avgX) ** 2, 0);
  if (den === 0) return null;

  const slope = num / den / Math.max(avgY, 1); // 정규화

  if (Math.abs(slope) >= critical) return { level: "critical", slope };
  if (Math.abs(slope) >= warn) return { level: "warning", slope };

  return null;
}

