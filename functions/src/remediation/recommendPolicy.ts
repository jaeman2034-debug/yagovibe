/**
 * ✅ COMMIT 27: Auto-Remediation 정책 추천 (AI)
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { summarizeWithLlmOrFallback } from "../ai/llm";

const db = admin.firestore();

/**
 * ✅ COMMIT 27: Remediation 정책 추천
 * 규칙 기반 + LLM 하이브리드 (자동 적용 ❌)
 */
export async function recommendRemediationPolicy(input: {
  tenantId: string;
  anomaly: { metric: string; level: string };
}) {
  const { tenantId, anomaly } = input;

  try {
    // 1) 과거 데이터 수집 (최근 30일)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const startTs = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);

    const [anomaliesSnap, remediationsSnap, effectsSnap] = await Promise.all([
      db
        .collection("_anomalies")
        .where("tenantId", "==", tenantId)
        .where("createdAt", ">=", startTs)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get(),
      db
        .collection("_activeRemediations")
        .where("tenantId", "==", tenantId)
        .limit(20)
        .get(),
      db
        .collection("_remediationEffects")
        .where("tenantId", "==", tenantId)
        .orderBy("evaluatedAt", "desc")
        .limit(20)
        .get(),
    ]);

    const history = {
      anomalies: anomaliesSnap.docs.map((d) => d.data()),
      remediations: remediationsSnap.docs.map((d) => d.data()),
      effects: effectsSnap.docs.map((d) => d.data()),
    };

    // 2) 규칙 기반 추천
    const rules: any[] = [];

    if (anomaly.metric === "audit.write.count" && anomaly.level === "critical") {
      rules.push({
        actions: ["rate_limit"],
        ttlMinutes: 30,
        reason: "과거 audit 폭증 시 rate_limit가 가장 효과적이었음",
      });
    }

    if (anomaly.metric === "ethics.block.count" && anomaly.level === "critical") {
      rules.push({
        actions: ["temporary_read_only"],
        ttlMinutes: 60,
        reason: "ethics 급증 시 읽기 전용 모드가 확산 차단에 효과적",
      });
    }

    if (anomaly.metric === "approvals.pending.count" && anomaly.level === "warning") {
      rules.push({
        actions: ["disable_approvals"],
        ttlMinutes: 120,
        reason: "승인 적체 시 임시 중단으로 혼선 방지",
      });
    }

    // 3) LLM 보조 요약 (결정 ❌, 추천만)
    let llmExplanation = "";
    try {
      const llm = await summarizeWithLlmOrFallback({
        collection: "remediation",
        action: "recommend",
        docId: `${tenantId}_${Date.now()}`,
        payload: {
          anomaly,
          history: {
            anomalies: history.anomalies.slice(0, 10),
            effects: history.effects.slice(0, 10),
          },
          rule: "추천만. 자동 적용 금지. 결정은 운영자 몫.",
        },
        ethicsScore: 100,
        ethicsReasons: [],
      });

      llmExplanation = llm.summary ?? "";
    } catch (error: any) {
      logger.warn(`[recommendRemediationPolicy] LLM 실패, 규칙만 반환: ${error?.message}`);
      llmExplanation = "과거 데이터 기반 추천 (규칙 기반)";
    }

    return {
      recommended: rules,
      explanation: llmExplanation || "과거 데이터 기반 추천",
      checklist: [
        "현재 트래픽 패턴 확인",
        "비슷한 과거 incident 재발 여부 확인",
        "완화 TTL 과도 여부 점검",
        "다른 테넌트 영향도 고려",
      ],
    };
  } catch (error: any) {
    logger.error(`[recommendRemediationPolicy] 오류:`, error);
    return {
      recommended: [],
      explanation: "추천 생성 실패",
      checklist: [],
    };
  }
}

