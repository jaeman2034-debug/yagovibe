/**
 * ✅ COMMIT 23: KPI 대시보드 컴포넌트
 */

import React from "react";
import { KpiCard } from "./KpiCard";
import { calcMttr } from "@/lib/kpi/calcMttr";
import { calcApprovalSla } from "@/lib/kpi/calcApprovalSla";
import { calcResilience } from "@/lib/kpi/calcResilience";

export function KpiDashboard({ data }: { data: any }) {
  if (!data) {
    return <div style={{ padding: 16, opacity: 0.7 }}>Loading KPI…</div>;
  }

  // MTTR 계산
  const mttr = calcMttr(
    data.anomalies
      .filter((a: any) => a.recoveredAt)
      .map((a: any) => ({
        startedAt: a.createdAt?.toDate?.() ?? new Date(a.createdAt),
        recoveredAt: a.recoveredAt?.toDate?.() ?? new Date(a.recoveredAt),
      }))
  );

  // Approval SLA 계산
  const sla = calcApprovalSla(
    data.approvals
      .filter((a: any) => a.resolvedAt)
      .map((a: any) => ({
        createdAt: a.createdAt?.toDate?.() ?? new Date(a.createdAt),
        resolvedAt: a.resolvedAt?.toDate?.() ?? new Date(a.resolvedAt),
      }))
  );

  // Resilience Score 집계
  const res = calcResilience(
    data.resilience.map((r: any) => ({ score: r.score ?? 0 }))
  );

  // ✅ COMMIT 26: Remediation 효과 집계
  const { effects } = useRemediationEffects(tenantId ?? "");
  const latestEffect = effects[0];
  const avgAuditReduction =
    effects.length > 0
      ? effects.reduce((sum: number, e: any) => sum + (e.effect?.auditReductionRate ?? 0), 0) /
        effects.length
      : null;

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <KpiCard
        title="MTTR"
        value={mttr ? `${mttr.avgMinutes} min` : "-"}
        sub={mttr ? `P95 ${mttr.p95Minutes} min (${mttr.samples} samples)` : ""}
      />
      <KpiCard
        title="Approval SLA (24h)"
        value={sla ? `${sla.sla24hRate}%` : "-"}
        sub={sla ? `Avg ${sla.avgHours}h (${sla.samples} samples)` : ""}
      />
      <KpiCard
        title="Resilience Score"
        value={res ? res.lastScore : "-"}
        sub={res ? `Avg ${res.avgScore}` : ""}
      />
      {/* ✅ COMMIT 26: Auto-Remediation 효과 */}
      <KpiCard
        title="Auto-Remediation 효과"
        value={
          latestEffect?.effect?.auditReductionRate !== null &&
          latestEffect?.effect?.auditReductionRate !== undefined
            ? `${latestEffect.effect.auditReductionRate}%`
            : avgAuditReduction !== null
            ? `${Math.round(avgAuditReduction)}%`
            : "-"
        }
        sub={
          latestEffect?.effect?.anomalyResolved
            ? "안정화 성공"
            : latestEffect?.effect?.approvalBacklogImproved
            ? "부분 개선"
            : ""
        }
      />
    </div>
  );
}

/**
 * ✅ COMMIT 28: 벤치마킹 섹션 (별도 컴포넌트)
 */
export function BenchmarkSection({ tenantId }: { tenantId?: string }) {
  // TODO: 실제 벤치마킹 데이터 로드
  // const { benchmark, loading } = useBenchmark(tenantId ?? "");

  // 임시: 벤치마킹 데이터 없으면 표시 안 함
  // if (loading || !benchmark) return null;

  return (
    <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid #eee" }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
        운영 벤치마킹 (조직 간 비교)
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* TODO: 실제 벤치마킹 데이터 연동 */}
        {/* <BenchmarkCard
          title="MTTR"
          value={mttr ? `${mttr.avgMinutes} min` : "-"}
          percentile={benchmark?.mttrPercentile ?? null}
        />
        <BenchmarkCard
          title="Approval SLA"
          value={sla ? `${sla.sla24hRate}%` : "-"}
          percentile={benchmark?.approvalSlaPercentile ?? null}
        />
        <BenchmarkCard
          title="Resilience Score"
          value={res ? String(res.lastScore) : "-"}
          percentile={benchmark?.resiliencePercentile ?? null}
        /> */}
        <div style={{ padding: 12, opacity: 0.7, fontSize: 14 }}>
          벤치마킹 데이터는 BigQuery 집계 후 제공됩니다.
        </div>
      </div>
    </div>
  );
}

