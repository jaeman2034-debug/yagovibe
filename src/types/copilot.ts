/**
 * ✅ COMMIT 20: Ops AI Copilot 타입 정의
 */

export type CopilotAnswer = {
  answer: string; // 자연어 답변
  evidence: Array<{
    source: "audit" | "ethics" | "approval" | "policy" | "anomaly" | "incident";
    id: string;
    timestamp?: string;
    summary?: string;
  }>;
  checklist: string[];
  limits: {
    tenantId: string;
    from?: string;
    to?: string;
    capped: boolean; // 결과가 limit으로 잘렸는지
  };
  links?: {
    incidentReplayUrl?: string;
    correlationId?: string;
    sentryQueryUrl?: string;
    datadogLogsUrl?: string;
    datadogApmUrl?: string;
  };
};

