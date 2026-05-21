/**
 * ✅ COMMIT 17: 알림 발송 (Slack)
 */

import fetch from "node-fetch";
import * as logger from "firebase-functions/logger";

export interface AlertInput {
  tenantId: string;
  metric: string;
  anomaly: { level: string; kind?: "zero" | "drop" | "z" | "drift"; z?: number; ratio?: number; slope?: number };
  value: number;
  link?: string; // Incident Replay deep link
}

export async function sendAlert(input: AlertInput): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    logger.warn("[sendAlert] SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
    return;
  }

  const explain =
    input.anomaly.kind === "zero"
      ? "지표 값이 0(또는 미수집)입니다."
      : input.anomaly.kind === "drop"
      ? `평균 대비 ${((input.anomaly.ratio ?? 0) * 100).toFixed(1)}%로 급감했습니다.`
      : input.anomaly.kind === "drift" && input.anomaly.slope
      ? `점진적 변화 감지 (기울기: ${(input.anomaly.slope * 100).toFixed(2)}%/일)`
      : input.anomaly.z
      ? `통계적 이상(Z-score: ${input.anomaly.z.toFixed(2)}) 감지.`
      : "이상 탐지";

  const text = `
🚨 *Anomaly Detected*

tenant: ${input.tenantId}
metric: ${input.metric}
value: ${input.value}
level: ${input.anomaly.level}

원인 설명:
- ${explain}

확인 권장:
- 수집 파이프라인 중단 여부
- 권한/배포/크론 실패 여부
- Incident Replay 확인: ${input.link ?? "(link 없음)"}
- Policy 변경 여부 확인
- Approval backlog 확인
`;

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      logger.error(`[sendAlert] Slack 알림 발송 실패: ${response.status} ${response.statusText}`);
    } else {
      logger.info(`[sendAlert] Slack 알림 발송 성공: ${input.tenantId}/${input.metric}`);
    }
  } catch (error: any) {
    logger.error(`[sendAlert] Slack 알림 발송 오류:`, error);
  }
}

