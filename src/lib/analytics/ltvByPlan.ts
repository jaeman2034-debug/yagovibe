import { calculateLtv, type LtvResult } from "@/lib/analytics/ltv";
import { toDate, type BillingDoc, normalizeMonthlyAmount } from "@/features/billing/lib/mrr";

export type PlanLtvRow = {
  plan: string;
  active: number;
  mrr: number;
  arpu: number;
  churnCount: number;
  churnRatePercent: number;
  ltv: LtvResult;
};

function statusLower(s: string | undefined) {
  return String(s || "").trim().toLowerCase();
}

/**
 * 팀 `plan` + `billingStatus` 기준 — 플랜별 MRR/ARPU/churn, LTV(하한·상한 동일)
 */
export function buildLtvByPlan(docs: BillingDoc[], now: Date = new Date()): PlanLtvRow[] {
  const month = now.getMonth();
  const year = now.getFullYear();

  const byPlan = new Map<
    string,
    { mrr: number; active: number; churn: number; amounts: number[] }
  >();

  docs.forEach((doc) => {
    const plan = String(doc.plan || "unknown").trim() || "unknown";
    const st = statusLower(doc.billingStatus);
    if (!byPlan.has(plan)) {
      byPlan.set(plan, { mrr: 0, active: 0, churn: 0, amounts: [] });
    }
    const row = byPlan.get(plan)!;

    if (st === "active") {
      const a = normalizeMonthlyAmount(doc);
      row.mrr += a;
      row.active += 1;
      row.amounts.push(a);
    }
    if (st === "canceled") {
      const canceledAt = toDate(doc.canceledAt);
      if (canceledAt && canceledAt.getMonth() === month && canceledAt.getFullYear() === year) {
        row.churn += 1;
      }
    }
  });

  return Array.from(byPlan.entries())
    .map(([plan, v]) => {
      const arpu = v.active > 0 ? v.mrr / v.active : 0;
      const churnRatePercent = v.active > 0 ? (v.churn / v.active) * 100 : 0;
      const ltv = calculateLtv({ arpu, churnRatePercent });
      return {
        plan,
        active: v.active,
        mrr: v.mrr,
        arpu,
        churnCount: v.churn,
        churnRatePercent,
        ltv,
      };
    })
    .filter((r) => r.active > 0)
    .sort((a, b) => b.mrr - a.mrr);
}
