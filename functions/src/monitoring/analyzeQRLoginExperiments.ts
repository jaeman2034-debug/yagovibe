/**
 * 🧪 QR 로그인 실험 분석 스케줄 함수
 * 
 * TTL 만료된 실험을 자동으로 분석하고 결과를 Slack에 리포트
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import * as logger from "firebase-functions/logger";
import { analyzeAllRunningExperiments, QRLoginExperimentResult } from "./qrLoginExperimentAnalysis";
import { createImprovementProposal } from "./qrLoginImprovementProposals";
import axios from "axios";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Slack Webhook URL 가져오기
 */
function getSlackWebhookUrl(): string | null {
  const url =
    process.env.SLACK_QR_ALERT_WEBHOOK_URL ||
    process.env.SLACK_QR_WEBHOOK_URL ||
    null;
  
  return url || null;
}

/**
 * 실험 결과를 Slack에 리포트
 */
async function sendExperimentReport(result: QRLoginExperimentResult): Promise<boolean> {
  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) {
    logger.warn("⚠️ [analyzeQRLoginExperiments] Slack Webhook URL이 설정되지 않음");
    return false;
  }

  const verdictEmoji = result.verdict === "positive" ? "✅" : result.verdict === "negative" ? "❌" : "➖";
  const verdictLabel = result.verdict === "positive" ? "Positive" : result.verdict === "negative" ? "Negative" : "Neutral";
  
  const flagLabel = result.flag === "smsUXVariant_v2" 
    ? "SMS UX Variant v2"
    : result.flag === "extendedExpire"
    ? "QR 만료 시간 +60초"
    : result.flag === "mobileUXBoost"
    ? "모바일 UX Boost"
    : result.flag;

  let message = `
🧪 ${verdictEmoji} *QR 로그인 자동 완화 실험 결과* (${verdictLabel})

플래그: ${flagLabel}
기간: ${result.before.sampleSize + result.after.sampleSize}건 (Before: ${result.before.sampleSize}건, After: ${result.after.sampleSize}건)

변화:
- 성공률: ${result.delta.successRate > 0 ? "+" : ""}${result.delta.successRate.toFixed(1)}% ${result.delta.successRate > 0 ? "✅" : result.delta.successRate < 0 ? "❌" : "➖"}
- SMS 실패율: ${result.delta.smsFailRate > 0 ? "+" : ""}${result.delta.smsFailRate.toFixed(1)}% ${result.delta.smsFailRate < 0 ? "✅" : result.delta.smsFailRate > 0 ? "❌" : "➖"}
- 평균 로그인 시간: ${result.delta.avgDuration > 0 ? "+" : ""}${result.delta.avgDuration}초 ${result.delta.avgDuration < 0 ? "✅" : result.delta.avgDuration > 0 ? "❌" : "➖"}
- 세션 만료율: ${result.delta.expiredRate > 0 ? "+" : ""}${result.delta.expiredRate.toFixed(1)}% ${result.delta.expiredRate < 0 ? "✅" : result.delta.expiredRate > 0 ? "❌" : "➖"}

신뢰도: ${(result.confidence * 100).toFixed(0)}%
`.trim();

  // 판정 및 추천
  if (result.verdict === "positive") {
    message += `\n\n📌 판정:\n→ 영구 적용 후보로 추천`;
  } else if (result.verdict === "negative") {
    message += `\n\n📌 판정:\n→ 자동 완화 비활성 유지`;
  } else {
    message += `\n\n📌 판정:\n→ 효과 불명확 (추가 데이터 필요)`;
  }

  const payload = {
    text: message,
  };

  try {
    await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });
    logger.info(`✅ [analyzeQRLoginExperiments] 실험 결과 리포트 전송 성공: ${result.experimentId}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ [analyzeQRLoginExperiments] 실험 결과 리포트 전송 실패: ${result.experimentId}`, {
      error: error.message,
    });
    return false;
  }
}

/**
 * 영구 개선 제안 알림 전송
 */
async function sendImprovementProposalNotification(
  proposalId: string,
  result: QRLoginExperimentResult
): Promise<boolean> {
  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) {
    logger.warn("⚠️ [analyzeQRLoginExperiments] Slack Webhook URL이 설정되지 않음");
    return false;
  }

  const flagLabel = result.flag === "smsUXVariant_v2" 
    ? "SMS UX Variant v2"
    : result.flag === "extendedExpire"
    ? "QR 만료 시간 +60초"
    : result.flag === "mobileUXBoost"
    ? "모바일 UX Boost"
    : result.flag;

  const message = `
🏆 *QR 로그인 개선 제안 생성됨*

플래그: ${flagLabel}
실험 결과: Positive ✅
표본 수: ${result.before.sampleSize + result.after.sampleSize} 세션 (Before: ${result.before.sampleSize}건, After: ${result.after.sampleSize}건)

개선 효과:
- 성공률: ${result.delta.successRate > 0 ? "+" : ""}${result.delta.successRate.toFixed(1)}% ✅
- SMS 실패율: ${result.delta.smsFailRate > 0 ? "+" : ""}${result.delta.smsFailRate.toFixed(1)}% ${result.delta.smsFailRate < 0 ? "✅" : "❌"}
- 평균 로그인 시간: ${result.delta.avgDuration > 0 ? "+" : ""}${result.delta.avgDuration}초 ${result.delta.avgDuration < 0 ? "✅" : "❌"}
- 세션 만료율: ${result.delta.expiredRate > 0 ? "+" : ""}${result.delta.expiredRate.toFixed(1)}% ${result.delta.expiredRate < 0 ? "✅" : "❌"}

신뢰도: ${(result.confidence * 100).toFixed(0)}%

📌 제안:
→ 영구 적용 권장

상태: 승인 대기 (Admin)
제안 ID: ${proposalId}
`.trim();

  const payload = {
    text: message,
  };

  try {
    await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });
    logger.info(`✅ [analyzeQRLoginExperiments] 개선 제안 알림 전송 성공: ${proposalId}`);
    return true;
  } catch (error: any) {
    logger.error(`❌ [analyzeQRLoginExperiments] 개선 제안 알림 전송 실패: ${proposalId}`, {
      error: error.message,
    });
    return false;
  }
}

/**
 * 실험 분석 스케줄 함수 (10분마다)
 */
export const analyzeQRLoginExperiments = onSchedule(
  {
    schedule: "*/10 * * * *", // 10분마다
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    logger.info("🧪 [analyzeQRLoginExperiments] 실험 분석 시작");

    try {
      const results = await analyzeAllRunningExperiments();

      if (results.length === 0) {
        logger.info("ℹ️ [analyzeQRLoginExperiments] 분석할 실험 없음");
        return;
      }

      logger.info(`✅ [analyzeQRLoginExperiments] ${results.length}개 실험 분석 완료`);

      // 각 실험 결과를 Slack에 리포트
      for (const result of results) {
        await sendExperimentReport(result);
        
        // Positive 판정이면 영구 개선 제안 생성
        if (result.verdict === "positive") {
          try {
            const proposalId = await createImprovementProposal(result);
            if (proposalId) {
              await sendImprovementProposalNotification(proposalId, result);
            }
          } catch (error: any) {
            logger.error("❌ [analyzeQRLoginExperiments] 개선 제안 생성 실패:", {
              experimentId: result.experimentId,
              error: error.message,
            });
          }
        }
      }
    } catch (error: any) {
      logger.error("❌ [analyzeQRLoginExperiments] 실험 분석 실패:", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
);
