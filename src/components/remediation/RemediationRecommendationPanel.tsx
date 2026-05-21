/**
 * ✅ COMMIT 27: Remediation 정책 추천 패널
 */

import React from "react";
import { requestRemediationRecommendation } from "@/lib/remediation/requestRemediationRecommendation";

export function RemediationRecommendationPanel({
  tenantId,
  anomaly,
}: {
  tenantId: string;
  anomaly: { metric: string; level: string };
}) {
  const [recommendation, setRecommendation] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);

  const loadRecommendation = async () => {
    setLoading(true);
    try {
      const res = await requestRemediationRecommendation({ tenantId, anomaly });
      setRecommendation(res.recommendation);
    } catch (error: any) {
      console.error("[RemediationRecommendationPanel] 추천 로딩 실패:", error);
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (tenantId && anomaly) {
      loadRecommendation();
    }
  }, [tenantId, anomaly.metric, anomaly.level]);

  if (loading) {
    return (
      <div style={{ border: "1px dashed #999", padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ opacity: 0.7 }}>추천 로딩 중...</div>
      </div>
    );
  }

  if (!recommendation || !recommendation.recommended?.length) {
    return null;
  }

  return (
    <div
      style={{
        border: "1px dashed #999",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        background: "#f9fafb",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
        🤖 추천 Auto-Remediation 정책
      </div>
      <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
        {recommendation.recommended.map((r: any, i: number) => (
          <li key={i} style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>
              Actions: {r.actions?.join(", ") ?? "N/A"} / TTL {r.ttlMinutes ?? "N/A"}분
            </div>
            {r.reason && (
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{r.reason}</div>
            )}
          </li>
        ))}
      </ul>
      {recommendation.explanation && (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12, fontStyle: "italic" }}>
          {recommendation.explanation}
        </div>
      )}
      {recommendation.checklist && recommendation.checklist.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>확인 항목:</div>
          <ul style={{ fontSize: 12, opacity: 0.8, paddingLeft: 20 }}>
            {recommendation.checklist.map((c: string, i: number) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

