/**
 * ✅ COMMIT 17: 일간 배치 잡
 * 하루 1회 실행하여 이상 탐지
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { buildBaseline } from "./baseline";
import { detectAnomaly } from "./detectAnomaly";
import { detectSilence } from "./detectSilence";
import { detectDrift } from "./detectDrift";
import { sendAlert } from "./alert";
import { shouldRemediate } from "../remediation/remediationEngine"; // ✅ COMMIT 24
import { applyRemediation } from "../remediation/applyRemediation"; // ✅ COMMIT 24
import type { RemediationPolicy } from "../../../src/lib/remediation/remediationPolicy"; // ✅ COMMIT 24

const db = admin.firestore();

function dayKeyUTC(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * ✅ COMMIT 17-4: Policy에서 Metric별 설정 로드
 */
async function getAnomalyConfig(tenantId: string, metric: string) {
  try {
    const policyDoc = await db.collection("_policies").doc(tenantId).get();
    if (!policyDoc.exists) return getDefaultConfig(metric);

    const policy: any = policyDoc.data();
    const metricPolicy = policy.anomaly?.[metric];
    if (!metricPolicy) return getDefaultConfig(metric);

    return {
      silence: {
        zeroIsCritical: metricPolicy.silence?.zeroIsCritical ?? (metric === "audit.write.count" ? true : false),
        dropRatioWarn: metricPolicy.silence?.dropWarn ?? 0.3,
        dropRatioCritical: metricPolicy.silence?.dropCritical ?? 0.1,
      },
      drift: {
        warnSlope: metricPolicy.drift?.warnSlope ?? 0.05,
        criticalSlope: metricPolicy.drift?.criticalSlope ?? 0.1,
      },
    };
  } catch (error: any) {
    logger.warn(`[getAnomalyConfig] Policy 로드 실패, 기본값 사용: ${error?.message}`);
    return getDefaultConfig(metric);
  }
}

/**
 * 기본 설정 (Policy가 없을 때)
 */
function getDefaultConfig(metric: string) {
  if (metric === "audit.write.count") {
    return {
      silence: { zeroIsCritical: true, dropRatioWarn: 0.3, dropRatioCritical: 0.1 },
      drift: { warnSlope: 0.05, criticalSlope: 0.1 },
    };
  }
  if (metric === "ethics.block.count") {
    return {
      silence: { zeroIsCritical: false, dropRatioWarn: 0.3, dropRatioCritical: 0.1 },
      drift: { warnSlope: 0.05, criticalSlope: 0.1 },
    };
  }
  if (metric === "approvals.pending.count") {
    return {
      silence: { zeroIsCritical: false, dropRatioWarn: 0.2, dropRatioCritical: 0.05 },
      drift: { warnSlope: 0.05, criticalSlope: 0.1 },
    };
  }
  return {
    silence: { zeroIsCritical: false, dropRatioWarn: 0.3, dropRatioCritical: 0.1 },
    drift: { warnSlope: 0.05, criticalSlope: 0.1 },
  };
}

export async function runDailyAnomalyCheck(tenantId: string, day = dayKeyUTC()) {
  const metrics = ["ethics.block.count", "approvals.pending.count", "audit.write.count"];

  logger.info(`[runDailyAnomalyCheck] 시작: tenantId=${tenantId}, day=${day}`);

  for (const metric of metrics) {
    try {
      const id = `${tenantId}_${metric}_${day}`;
      const todayDoc = await db.collection("_metrics").doc(id).get();
      if (!todayDoc.exists) {
        logger.info(`[runDailyAnomalyCheck] 오늘 데이터 없음: ${tenantId}/${metric}/${day}`);
        continue;
      }

      const today: any = todayDoc.data();
      const baseline = await buildBaseline(tenantId, metric, 14);
      if (!baseline) {
        logger.info(`[runDailyAnomalyCheck] 기준선 부족: ${tenantId}/${metric}`);
        continue;
      }

      const todayValue = Number(today.value);

      // ✅ COMMIT 17-4: Policy에서 설정 로드
      const config = await getAnomalyConfig(tenantId, metric);

      // 1) Silence 체크 (metric별 설정 적용)
      const silence = detectSilence({
        value: todayValue,
        baseline,
        zeroIsCritical: config.silence.zeroIsCritical,
        dropRatioWarn: config.silence.dropRatioWarn,
        dropRatioCritical: config.silence.dropRatioCritical,
      });

      // 2) Z-score 체크
      const zAnomaly = detectAnomaly({
        value: todayValue,
        baseline,
      });

      // 3) Drift 체크 (최근 14일 히스토리)
      const historySnap = await db
        .collection("_metrics")
        .where("tenantId", "==", tenantId)
        .where("metric", "==", metric)
        .orderBy("date", "asc")
        .limit(14)
        .get();

      const historyValues = historySnap.docs.map((d) => Number(d.data().value));
      const drift = detectDrift(historyValues, {
        warnSlope: config.drift.warnSlope,
        criticalSlope: config.drift.criticalSlope,
      });

      // 4) 우선순위 결정 (Silence > Z-score > Drift)
      const anomaly =
        silence && zAnomaly
          ? // 둘 다 있으면 critical 우선
            (silence.level === "critical" || zAnomaly.level === "critical"
              ? { level: "critical" as const, kind: silence.kind ?? "z", z: zAnomaly.z, ratio: silence.ratio, slope: undefined }
              : { level: "warning" as const, kind: silence.kind ?? "z", z: zAnomaly.z, ratio: silence.ratio, slope: undefined })
          : silence
          ? { ...silence, z: undefined, slope: undefined }
          : zAnomaly
          ? { level: zAnomaly.level, kind: "z" as const, z: zAnomaly.z, ratio: undefined, slope: undefined }
          : drift
          ? { level: drift.level, kind: "drift" as const, slope: drift.slope, z: undefined, ratio: undefined }
          : null;

      if (!anomaly) continue;

      const anomalyKind = anomaly.kind ?? "z";
      logger.warn(
        `[runDailyAnomalyCheck] 이상 탐지: ${tenantId}/${metric}, level=${anomaly.level}, kind=${anomalyKind}${anomaly.z ? `, z=${anomaly.z.toFixed(2)}` : ""}${anomaly.ratio ? `, ratio=${(anomaly.ratio * 100).toFixed(1)}%` : ""}${anomaly.slope ? `, slope=${anomaly.slope.toFixed(4)}` : ""}`
      );

      await db.collection("_anomalies").add({
        tenantId,
        metric,
        value: todayValue,
        baseline,
        anomaly,
        day,
        date: today.date, // Timestamp
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // COMMIT 17-3: Incident Summary 자동 생성 (중복 방지)
      const summaryKey = `${tenantId}_${day}`;
      const summaryExists = await db.collection("_incidentSummaries").doc(summaryKey).get();
      if (!summaryExists.exists) {
        try {
          const from = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
          const to = new Date().toISOString();
          await summarizeIncident({ tenantId, from, to });
          logger.info(`[runDailyAnomalyCheck] Incident Summary 생성: ${tenantId}/${day}`);
        } catch (error: any) {
          logger.error(`[runDailyAnomalyCheck] Incident Summary 생성 실패:`, error);
        }
      }

      // Incident 링크(프론트 라우트) — tenant/day 기준으로 24h 범위 열게
      const link = `${process.env.APP_BASE_URL ?? ""}/incidents?range=24h&tenantId=${tenantId}`;

      await sendAlert({
        tenantId,
        metric,
        anomaly,
        value: todayValue,
        link,
      });

      // ✅ COMMIT 24: Auto-Remediation 체크 및 적용
      try {
        const policySnap = await db.collection("_remediationPolicies").doc(tenantId).get();
        const remediationPolicy = policySnap.exists
          ? (policySnap.data() as RemediationPolicy)
          : null;

        if (
          remediationPolicy &&
          shouldRemediate({
            policy: remediationPolicy,
            anomaly: { level: anomaly.level, metric },
          })
        ) {
          await applyRemediation({
            tenantId,
            policy: remediationPolicy,
            anomaly: { level: anomaly.level, metric },
          });

          // ✅ COMMIT 24: Audit 로그
          await db.collection("_auditLogs").add({
            tenantId,
            action: "auto_remediation.applied",
            collection: "_activeRemediations",
            docId: tenantId,
            after: {
              actions: remediationPolicy.actions,
              anomaly: { level: anomaly.level, metric },
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.info(`[runDailyAnomalyCheck] Auto-Remediation 적용: ${tenantId}/${metric}`);
        }
      } catch (remediationError: any) {
        logger.error(`[runDailyAnomalyCheck] Auto-Remediation 적용 실패:`, remediationError);
        // Remediation 실패해도 Alert은 발송됨
      }

      // ✅ COMMIT 18-1: 플러그인 훅 실행 (Datadog 등)
      try {
        const { onAnomalyDetected } = await import("../plugins/anomalyHooks");
        await onAnomalyDetected(tenantId, {
          metric,
          value: todayValue,
          anomaly,
        });
      } catch (error: any) {
        logger.warn(`[runDailyAnomalyCheck] 플러그인 호출 실패: ${error?.message}`);
        // 실패해도 본 흐름 영향 0
      }
    } catch (error: any) {
      logger.error(`[runDailyAnomalyCheck] 오류 (${tenantId}/${metric}):`, error);
    }
  }

  logger.info(`[runDailyAnomalyCheck] 완료: tenantId=${tenantId}, day=${day}`);

  return { ok: true, tenantId, day };
}

