/**
 * ✅ COMMIT 17: 이상 탐지 대시보드 페이지
 */

import React from "react";
import { useAnomalyAlerts } from "@/lib/anomaly/useAnomalyAlerts";
import { AnomalyAlertPanel } from "@/components/anomaly/AnomalyAlertPanel";
import { useAuth } from "@/context/AuthProvider";

export function AnomalyDashboard() {
  const { user } = useAuth();
  // TODO: 실제 tenantId/associationId 가져오기
  const tenantId = "assoc-nowon-football"; // 임시 (실제로는 useParams 또는 context에서)
  // TODO: 실제 권한 체크로 교체 (useIsAssociationAdmin 등)
  const role: "admin" | "editor" | "viewer" = (window as any).__ROLE__ ?? "viewer";

  const alerts = useAnomalyAlerts(tenantId);

  if (role !== "admin") {
    return <div style={{ padding: 16 }}>관리자만 접근 가능합니다.</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 24 }}>Anomaly Dashboard</h2>
      <div style={{ marginBottom: 16, opacity: 0.7 }}>
        테넌트: {tenantId} · 총 {alerts.length}개 경보
      </div>
      <AnomalyAlertPanel alerts={alerts} />
    </div>
  );
}

