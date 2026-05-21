/**
 * ✅ COMMIT 18-1: Datadog Plugin
 * APM / Logs / Metrics 연동 플러그인
 */

import type { PluginHooks } from "../types";
import { ddLog, ddMetric, ddTrace } from "@/lib/observability/datadog";

export const datadogPlugin: PluginHooks = {
  name: "datadog",

  enabled: (ctx) => {
    // admin 액션만 추적하고 싶다면 여기서 제한 가능
    return Boolean(ctx.correlationId);
  },

  beforeSave: async (ctx) => {
    ddLog("before_save", {
      tenantId: ctx.tenantId,
      collection: ctx.collection,
      action: ctx.action,
      correlationId: ctx.correlationId,
    });
  },

  afterSave: async (ctx, saved) => {
    ddMetric("crud.save.count", 1, {
      tenantId: ctx.tenantId,
      collection: ctx.collection,
      action: ctx.action,
    });

    ddLog("after_save", {
      tenantId: ctx.tenantId,
      collection: ctx.collection,
      docId: ctx.docId,
      correlationId: ctx.correlationId,
    });

    // Trace (duration 계산)
    if (ctx.startedAt) {
      ddTrace("save_document", Date.now() - ctx.startedAt, {
        tenantId: ctx.tenantId,
        collection: ctx.collection,
        correlationId: ctx.correlationId,
      });
    }
  },

  afterEvaluateEthics: async (ctx, decision) => {
    ddMetric("ethics.decision", 1, {
      tenantId: ctx.tenantId,
      verdict: decision.verdict,
    });

    ddLog("ethics_decision", {
      tenantId: ctx.tenantId,
      verdict: decision.verdict,
      score: decision.score,
      correlationId: ctx.correlationId,
    });
  },

  onApprovalCreated: async (ctx, approvalId) => {
    ddMetric("approval.created", 1, {
      tenantId: ctx.tenantId,
      collection: ctx.collection,
    });

    ddLog("approval_created", {
      tenantId: ctx.tenantId,
      approvalId,
      correlationId: ctx.correlationId,
    });
  },

  onAnomalyDetected: async (tenantId, payload) => {
    ddMetric("anomaly.detected", 1, {
      tenantId,
      metric: payload.metric,
      level: payload.anomaly?.level,
    });

    ddLog("anomaly_detected", {
      tenantId,
      metric: payload.metric,
      level: payload.anomaly?.level,
    });
  },
};

