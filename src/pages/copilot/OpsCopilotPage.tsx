/**
 * ✅ COMMIT 20: Ops AI Copilot 페이지
 */

import React from "react";
import { CopilotChat } from "@/components/copilot/CopilotChat";

export default function OpsCopilotPage() {
  const role = (window as any).__ROLE__ ?? "viewer";
  const tenantId = (window as any).__TENANT_ID__ ?? "default-tenant";

  // 운영 Copilot은 admin만 권장
  if (role !== "admin") {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ padding: 12, background: "#fee", border: "1px solid #fcc", borderRadius: 8 }}>
          관리자만 접근 가능합니다.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 24 }}>Ops AI Copilot</h2>
      <div style={{ marginBottom: 16, opacity: 0.8, fontSize: 14 }}>
        자연어로 운영 질의를 입력하세요. Audit/Ethics/Approval/Policy/Anomaly 데이터를 근거로 답변합니다.
      </div>
      <CopilotChat tenantId={tenantId} />
    </div>
  );
}
