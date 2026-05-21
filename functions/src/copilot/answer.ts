/**
 * ✅ COMMIT 20: 답변 생성 (LLM + fallback)
 * LLM 키 없으면 규칙 기반 템플릿 답변으로 완전 동작
 * LLM 사용 시에도 "결정 금지" 고정
 */

import * as logger from "firebase-functions/logger";

// LLM 함수 import (실제 경로에 맞게 수정 필요)
// import { summarizeWithLlmOrFallback } from "../ai/llm";

type CopilotAnswer = {
  answer: string;
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
    capped: boolean;
  };
  links?: {
    incidentReplayUrl?: string;
    correlationId?: string;
    sentryQueryUrl?: string;
    datadogLogsUrl?: string;
    datadogApmUrl?: string;
  };
};

/**
 * ✅ COMMIT 20-1: Incident Replay URL 생성
 */
function buildIncidentReplayUrl(tenantId: string, from?: string, to?: string): string {
  const base = process.env.APP_BASE_URL ?? "";
  const qs = new URLSearchParams({
    tenantId,
    ...(from && { from }),
    ...(to && { to }),
  });
  return `${base}/incidents?${qs.toString()}`;
}

/**
 * ✅ COMMIT 20-2: correlationId 추출
 */
function pickCorrelationId(ctx: any): string | null {
  const candidates: string[] = [];
  (ctx.audit ?? []).forEach((a: any) => {
    if (a.correlationId) candidates.push(a.correlationId);
  });
  (ctx.ethics ?? []).forEach((e: any) => {
    if (e.correlationId) candidates.push(e.correlationId);
  });
  (ctx.approvals ?? []).forEach((ap: any) => {
    if (ap.correlationId) candidates.push(ap.correlationId);
  });
  return candidates[0] ?? null;
}

/**
 * ✅ COMMIT 20-2: Sentry URL 생성
 */
function buildSentryUrl(cid: string): string | null {
  const base = process.env.SENTRY_ISSUES_URL;
  if (!base) return null;
  return `${base}?query=correlationId:${encodeURIComponent(cid)}`;
}

/**
 * ✅ COMMIT 20-2: Datadog Logs URL 생성
 */
function buildDatadogLogsUrl(cid: string): string | null {
  const base = process.env.DATADOG_LOGS_URL;
  if (!base) return null;
  return `${base}?query=correlationId:${encodeURIComponent(cid)}`;
}

/**
 * ✅ COMMIT 20-2: Datadog APM URL 생성
 */
function buildDatadogApmUrl(cid: string): string | null {
  const base = process.env.DATADOG_APM_URL;
  if (!base) return null;
  return `${base}?query=correlationId:${encodeURIComponent(cid)}`;
}

function fallbackAnswer(tenantId: string, q: string, ctx: any): CopilotAnswer {
  const evidence: CopilotAnswer["evidence"] = [];

  (ctx.anomalies ?? []).slice(0, 3).forEach((a: any) => {
    evidence.push({
      source: "anomaly",
      id: a.id,
      timestamp: a.createdAt?.toDate?.()?.toISOString?.(),
    });
  });

  const checklist = [
    "Incident Replay에서 동일 시간대 이벤트 확인",
    "최근 Policy Change 여부 확인",
    "승인 대기(pending) 급증 여부 확인",
    "특정 collection/docId 집중 여부 확인",
  ];

  // ✅ COMMIT 20-1, 20-2: 링크 생성 (fallback에도 적용)
  const incidentReplayUrl = buildIncidentReplayUrl(tenantId, ctx.from, ctx.to);
  const cid = pickCorrelationId(ctx);
  const sentryUrl = cid ? buildSentryUrl(cid) : null;
  const ddLogs = cid ? buildDatadogLogsUrl(cid) : null;
  const ddApm = cid ? buildDatadogApmUrl(cid) : null;

  const links: CopilotAnswer["links"] = {
    incidentReplayUrl,
    ...(cid && { correlationId: cid }),
    ...(sentryUrl && { sentryQueryUrl: sentryUrl }),
    ...(ddLogs && { datadogLogsUrl: ddLogs }),
    ...(ddApm && { datadogApmUrl: ddApm }),
  };

  return {
    answer:
      `질의: "${q}"\n` +
      `최근 ${ctx.anomalies?.length ?? 0}개의 경보/지표 변화를 확인했습니다. ` +
      `상세 근거는 evidence를 참고하세요.`,
    evidence,
    checklist,
    limits: { tenantId, from: ctx.from, to: ctx.to, capped: Boolean(ctx.capped) },
    links,
  };
}

export async function generateCopilotAnswer(input: {
  tenantId: string;
  question: string;
  ctx: any;
}): Promise<CopilotAnswer> {
  const { tenantId, question, ctx } = input;

  // LLM 사용 시도 (없으면 fallback)
  try {
    // 동적 import로 LLM 함수 로드 시도
    const { summarizeWithLlmOrFallback } = await import("../ai/llm");

    const payload = {
      tenantId,
      question,
      window: { from: ctx.from, to: ctx.to },
      anomalies: (ctx.anomalies ?? []).slice(0, 10),
      policyChanges: (ctx.policyChanges ?? []).slice(0, 5),
      approvals: (ctx.approvals ?? []).slice(0, 20),
      ethics: (ctx.ethics ?? []).slice(0, 20),
      audit: (ctx.audit ?? []).slice(0, 20),
      rule: "결정/승인/반려 지시 금지. 사실 요약 + 근거 + 확인 항목만.",
    };

    const llm = await summarizeWithLlmOrFallback({
      collection: "copilot",
      action: "answer",
      docId: `${tenantId}_${Date.now()}`,
      payload,
      ethicsScore: 100,
      ethicsReasons: [],
    });

    const evidence: CopilotAnswer["evidence"] = [];

    (ctx.anomalies ?? []).slice(0, 5).forEach((a: any) => {
      evidence.push({
        source: "anomaly",
        id: a.id,
        timestamp: a.createdAt?.toDate?.()?.toISOString?.(),
      });
    });

    (ctx.policyChanges ?? []).slice(0, 3).forEach((p: any) => {
      evidence.push({
        source: "policy",
        id: p.id,
        timestamp: p.createdAt?.toDate?.()?.toISOString?.(),
      });
    });

    (ctx.approvals ?? []).slice(0, 3).forEach((a: any) => {
      evidence.push({
        source: "approval",
        id: a.id,
        timestamp: a.createdAt?.toDate?.()?.toISOString?.(),
      });
    });

    const checklist = [
      "Incident Replay에서 해당 기간(From~To) 타임라인 확인",
      "Anomaly metric과 연관된 collection/docId 집중 여부 확인",
      "Policy 변경 직후 지표 변동 여부 확인",
      "Pending approvals가 늘었으면 승인 병목 원인 확인",
    ];

    return {
      answer: `${llm.summary}\n\n(추천 확인)\n${llm.recommendation}`,
      evidence,
      checklist,
      limits: { tenantId, from: ctx.from, to: ctx.to, capped: Boolean(ctx.capped) },
    };
  } catch (error: any) {
    logger.warn(`[generateCopilotAnswer] LLM 실패, fallback 사용: ${error?.message}`);
    return fallbackAnswer(tenantId, question, ctx);
  }
}

