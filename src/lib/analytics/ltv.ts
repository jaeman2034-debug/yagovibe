export type LtvInput = {
  arpu: number;
  churnRatePercent: number;
};

export type LtvResult = {
  ltv: number;
  arpu: number;
  /** 측정된 월 이탈률(소수) */
  churnRate: number;
  /** LTV에 사용한 월 이탈률(하한 적용 후) */
  effectiveChurnRate: number;
  avgLifetimeMonths: number;
  wasChurnFloorApplied: boolean;
  wasLtvCapped: boolean;
};

const DEFAULT_MIN_MONTHLY_CHURN = 0.0001; // 0.01% — 극소 churn 시 LTV 폭주 방지
const DEFAULT_MAX_LIFETIME_MONTHS = 24;

/**
 * LTV = ARPU / (월 churn). churn≈0 대비: 최소 이탈률 하한 + LTV 상한(평균 ARPU·최대 24개월)
 */
export function calculateLtv(
  input: LtvInput,
  options?: { minMonthlyChurnRate?: number; maxLifetimeMonths?: number }
): LtvResult {
  const arpu = Number.isFinite(input.arpu) ? Math.max(0, input.arpu) : 0;
  const churnRatePercent = Number.isFinite(input.churnRatePercent) ? Math.max(0, input.churnRatePercent) : 0;
  const rawChurnRate = churnRatePercent / 100;
  const minChurn = options?.minMonthlyChurnRate ?? DEFAULT_MIN_MONTHLY_CHURN;
  const maxLife = options?.maxLifetimeMonths ?? DEFAULT_MAX_LIFETIME_MONTHS;
  const effectiveChurnRate = Math.max(rawChurnRate, minChurn);
  const wasChurnFloorApplied = rawChurnRate < minChurn;
  const avgLifetimeMonths = Math.min(1 / effectiveChurnRate, maxLife);
  let ltv = effectiveChurnRate > 0 ? arpu / effectiveChurnRate : 0;
  const maxLtv = arpu * maxLife;
  const wasLtvCapped = ltv > maxLtv;
  ltv = Math.min(ltv, maxLtv);

  return {
    ltv,
    arpu,
    churnRate: rawChurnRate,
    effectiveChurnRate,
    avgLifetimeMonths,
    wasChurnFloorApplied,
    wasLtvCapped,
  };
}

/**
 * CAC 상환(월) — `Payback = CAC / ARPU`
 */
export function calculatePaybackMonths(arpu: number, cac: number): number {
  if (!Number.isFinite(arpu) || arpu <= 0) return 0;
  if (!Number.isFinite(cac) || cac <= 0) return 0;
  return cac / arpu;
}

/**
 * ARPU 기준 CAC 회수 — 6개월 미만 건강 · 6~12개월 보통 · 12개월 초과 위험
 */
export function getPaybackHealthLabel(paybackMonths: number): "건강" | "보통" | "위험" | "—" {
  if (!Number.isFinite(paybackMonths) || paybackMonths <= 0) return "—";
  if (paybackMonths < 6) return "건강";
  if (paybackMonths <= 12) return "보통";
  return "위험";
}
