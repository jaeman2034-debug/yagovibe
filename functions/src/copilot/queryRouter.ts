/**
 * ✅ COMMIT 20: Query Router - 의도 분류 (룰 기반 1차)
 * LLM 없이도 1차 분류 가능해야 안전/비용 안정
 */

export type QueryIntent =
  | { type: "why_alert"; windowHours: number }
  | { type: "pending_approvals" }
  | { type: "recent_policy_change" }
  | { type: "incident_summary"; windowHours: number }
  | { type: "general"; windowHours: number };

export function routeQuery(q: string): QueryIntent {
  const s = q.toLowerCase();

  if (s.includes("경보") || s.includes("anomaly") || s.includes("왜 울") || s.includes("알림")) {
    return { type: "why_alert", windowHours: 24 };
  }

  if (s.includes("승인") && (s.includes("대기") || s.includes("pending"))) {
    return { type: "pending_approvals" };
  }

  if (s.includes("정책") || s.includes("policy")) {
    return { type: "recent_policy_change" };
  }

  if (s.includes("사건") || s.includes("incident") || s.includes("타임라인")) {
    return { type: "incident_summary", windowHours: 24 };
  }

  return { type: "general", windowHours: 24 };
}

