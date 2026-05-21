/**
 * ✅ COMMIT 23: Operations KPI Dashboard 페이지
 */

import React from "react";
import { useKpiMetrics } from "@/lib/kpi/useKpiMetrics";
import { KpiDashboard, BenchmarkSection } from "@/components/kpi/KpiDashboard";

export function OpsKpiDashboard() {
  const tenantId = (window as any).__TENANT_ID__ ?? "default-tenant";
  const role = (window as any).__ROLE__ ?? "viewer";

  if (role !== "admin") {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ padding: 12, background: "#fee", border: "1px solid #fcc", borderRadius: 8 }}>
          관리자만 접근 가능합니다.
        </div>
      </div>
    );
  }

  const { data, loading } = useKpiMetrics(tenantId);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 24 }}>Operations KPI</h2>
      <div style={{ marginBottom: 16, opacity: 0.7, fontSize: 14 }}>
        테넌트: {tenantId}
      </div>
      {loading ? (
        <div style={{ padding: 16, opacity: 0.7 }}>KPI 데이터 로딩 중...</div>
      ) : (
        <>
          <KpiDashboard data={data} tenantId={tenantId} />
          <BenchmarkSection tenantId={tenantId} />
        </>
      )}
    </div>
  );
}

