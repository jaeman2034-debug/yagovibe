/**
 * 🔥 주간 리포트 자동 집계 크론잡 (의사코드)
 * 
 * 실행 주기: 매주 월요일 오전 9시 (KST)
 * 집계 기간: 지난 주 월요일 00:00 ~ 일요일 23:59:59 (UTC)
 * 전송 대상: Slack Webhook 또는 이메일
 */

import { Pool } from 'pg';
import axios from 'axios';

const pool = new Pool({
  // ... DB 연결 설정
});

interface WeeklyReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
    sampleSize: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    slowRequests: number;
    slowRate: number;
  };
  byEnvironment: {
    kakaoInApp: any;
    mobile: any;
    desktop: any;
  };
  byErrorCode: Record<string, number>;
}

/**
 * 🔥 주간 리포트 생성
 */
async function generateWeeklyReport(): Promise<WeeklyReport> {
  // 지난 주 월요일 00:00 ~ 일요일 23:59:59 계산 (UTC)
  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7); // 지난 주 월요일
  lastMonday.setHours(0, 0, 0, 0);
  
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);

  const startTimestamp = lastMonday.getTime();
  const endTimestamp = lastSunday.getTime();

  // 통계 API 호출 (또는 직접 쿼리)
  const statsQuery = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE result_success = true) as success,
      COUNT(*) FILTER (WHERE result_success = false) as failed,
      AVG(result_latency) FILTER (WHERE result_success = true) as avg_latency,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY result_latency) FILTER (WHERE result_success = true) as p95_latency,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY result_latency) FILTER (WHERE result_success = true) as p99_latency,
      COUNT(*) FILTER (WHERE result_is_slow = true) as slow_requests
    FROM ai_analysis_logs
    WHERE timestamp >= $1 AND timestamp <= $2
  `;

  const summaryResult = await pool.query(statsQuery, [startTimestamp, endTimestamp]);
  const summary = summaryResult.rows[0];

  const total = parseInt(summary.total) || 0;
  const success = parseInt(summary.success) || 0;
  const failed = parseInt(summary.failed) || 0;
  const avgLatency = parseFloat(summary.avg_latency) || 0;
  const p95Latency = parseFloat(summary.p95_latency) || 0;
  const p99Latency = parseFloat(summary.p99_latency) || 0;
  const slowRequests = parseInt(summary.slow_requests) || 0;

  // 환경별 통계 쿼리
  const envQuery = `
    SELECT 
      env_is_kakao_in_app,
      env_is_mobile,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE result_success = true) as success,
      AVG(result_latency) FILTER (WHERE result_success = true) as avg_latency,
      COUNT(*) FILTER (WHERE result_is_slow = true) as slow_requests
    FROM ai_analysis_logs
    WHERE timestamp >= $1 AND timestamp <= $2
    GROUP BY env_is_kakao_in_app, env_is_mobile
  `;

  const envResult = await pool.query(envQuery, [startTimestamp, endTimestamp]);

  // 환경별 데이터 구조화 (getAIAnalysisStats와 동일 로직)
  // ... (생략, 위의 API 핸들러 코드 참조)

  // 에러 코드별 분포
  const errorCodeQuery = `
    SELECT 
      result_error_code,
      COUNT(*) as count
    FROM ai_analysis_logs
    WHERE timestamp >= $1 AND timestamp <= $2
      AND result_error_code IS NOT NULL
    GROUP BY result_error_code
    ORDER BY count DESC
    LIMIT 5
  `;

  const errorCodeResult = await pool.query(errorCodeQuery, [startTimestamp, endTimestamp]);
  const byErrorCode: Record<string, number> = {};
  for (const row of errorCodeResult.rows) {
    byErrorCode[row.result_error_code] = parseInt(row.count) || 0;
  }

  return {
    period: {
      startDate: lastMonday.toISOString(),
      endDate: lastSunday.toISOString(),
    },
    summary: {
      total,
      success,
      failed,
      successRate: total > 0 ? (success / total) * 100 : 0,
      sampleSize: total,
      avgLatency: Math.round(avgLatency),
      p95Latency: Math.round(p95Latency),
      p99Latency: Math.round(p99Latency),
      slowRequests,
      slowRate: total > 0 ? (slowRequests / total) * 100 : 0,
    },
    byEnvironment: {
      // ... (환경별 데이터)
    },
    byErrorCode,
  };
}

/**
 * 🔥 전환 통계 조회 (B단계: 인앱 유지 vs 외부 전환 비교)
 */
interface ConversionStats {
  stayedTotal: number;
  stayedSuccess: number;
  stayedSuccessRate: number;
  stayedAvgLatency: number;
  stayedSlowRate: number;
  stayedRetrySuccessRate: number;
  convertedTotal: number;
  convertedSuccess: number;
  convertedSuccessRate: number;
  convertedAvgLatency: number;
  convertedSlowRate: number;
  convertedRetrySuccessRate: number;
  roiPercentagePoints: number;
}

async function getConversionStats(startTimestamp: number, endTimestamp: number): Promise<ConversionStats | null> {
  try {
    const query = `
      WITH conversion_stats AS (
        SELECT 
          CASE 
            WHEN meta_environment = 'EXTERNAL_BROWSER' AND meta_flow_id IS NOT NULL THEN 'converted'
            WHEN env_is_kakao_in_app = true AND (meta_flow_id IS NULL OR meta_environment = 'INAPP_BROWSER') THEN 'stayed'
            ELSE 'other'
          END as conversion_group,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE result_success = true) as success,
          AVG(result_latency) FILTER (WHERE result_success = true) as avg_latency,
          COUNT(*) FILTER (WHERE result_is_slow = true) as slow_requests,
          COUNT(*) FILTER (WHERE result_retry_count > 0 AND result_success = true) as retry_successes,
          COUNT(*) FILTER (WHERE result_retry_count > 0) as retry_attempts
        FROM ai_analysis_logs
        WHERE 
          timestamp >= $1
          AND timestamp <= $2
          AND env_is_kakao_in_app = true
        GROUP BY conversion_group
      ),
      stay_stats AS (
        SELECT * FROM conversion_stats WHERE conversion_group = 'stayed'
      ),
      convert_stats AS (
        SELECT * FROM conversion_stats WHERE conversion_group = 'converted'
      )
      SELECT 
        s.total as stayed_total,
        s.success as stayed_success,
        ROUND((s.success::numeric / s.total::numeric) * 100, 2) as stayed_success_rate,
        ROUND(s.avg_latency, 0) as stayed_avg_latency_ms,
        ROUND((s.slow_requests::numeric / s.total::numeric) * 100, 2) as stayed_slow_rate,
        CASE 
          WHEN s.retry_attempts > 0 THEN
            ROUND((s.retry_successes::numeric / s.retry_attempts::numeric) * 100, 2)
          ELSE 0
        END as stayed_retry_success_rate,
        c.total as converted_total,
        c.success as converted_success,
        ROUND((c.success::numeric / c.total::numeric) * 100, 2) as converted_success_rate,
        ROUND(c.avg_latency, 0) as converted_avg_latency_ms,
        ROUND((c.slow_requests::numeric / c.total::numeric) * 100, 2) as converted_slow_rate,
        CASE 
          WHEN c.retry_attempts > 0 THEN
            ROUND((c.retry_successes::numeric / c.retry_attempts::numeric) * 100, 2)
          ELSE 0
        END as converted_retry_success_rate,
        ROUND(
          (c.success::numeric / c.total::numeric) * 100 - (s.success::numeric / s.total::numeric) * 100,
          2
        ) as roi_percentage_points
      FROM stay_stats s
      CROSS JOIN convert_stats c
    `;

    const result = await pool.query(query, [startTimestamp, endTimestamp]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      stayedTotal: parseInt(row.stayed_total) || 0,
      stayedSuccess: parseInt(row.stayed_success) || 0,
      stayedSuccessRate: parseFloat(row.stayed_success_rate) || 0,
      stayedAvgLatency: parseFloat(row.stayed_avg_latency_ms) || 0,
      stayedSlowRate: parseFloat(row.stayed_slow_rate) || 0,
      stayedRetrySuccessRate: parseFloat(row.stayed_retry_success_rate) || 0,
      convertedTotal: parseInt(row.converted_total) || 0,
      convertedSuccess: parseInt(row.converted_success) || 0,
      convertedSuccessRate: parseFloat(row.converted_success_rate) || 0,
      convertedAvgLatency: parseFloat(row.converted_avg_latency_ms) || 0,
      convertedSlowRate: parseFloat(row.converted_slow_rate) || 0,
      convertedRetrySuccessRate: parseFloat(row.converted_retry_success_rate) || 0,
      roiPercentagePoints: parseFloat(row.roi_percentage_points) || 0,
    };
  } catch (error) {
    console.error('❌ [getConversionStats] 조회 실패:', error);
    return null;
  }
}

/**
 * 🔥 Slack 메시지 포맷팅 (B단계: 전환 ROI 포함)
 */
function formatSlackMessage(report: WeeklyReport, conversionStats?: ConversionStats | null): any {
  const { summary, byEnvironment, byErrorCode } = report;
  const startDate = new Date(report.period.startDate).toLocaleDateString('ko-KR');
  const endDate = new Date(report.period.endDate).toLocaleDateString('ko-KR');

  // 인사이트 추출
  const kakaoSuccessRate = byEnvironment.kakaoInApp.successRate || 0;
  const externalSuccessRate = byEnvironment.desktop.successRate || 0;
  const successRateDiff = externalSuccessRate - kakaoSuccessRate;

  let insight = '';
  if (successRateDiff > 5) {
    insight = `• 카카오 인앱 성공률이 외부 브라우저 대비 ${successRateDiff.toFixed(1)}%p 낮음\n• 외부 브라우저 유도 UX 유지 권장`;
  } else if (successRateDiff < -5) {
    insight = `• 외부 브라우저 성공률이 카카오 인앱 대비 ${Math.abs(successRateDiff).toFixed(1)}%p 낮음\n• 외부 브라우저 이슈 조사 필요`;
  } else {
    insight = `• 카카오 인앱과 외부 브라우저 성공률 차이 미미 (${successRateDiff.toFixed(1)}%p)`;
  }

  // 🔥 B단계: 전환 ROI 인사이트 추가
  let conversionInsight = '';
  if (conversionStats && conversionStats.stayedTotal > 0 && conversionStats.convertedTotal > 0) {
    const roi = conversionStats.roiPercentagePoints;
    if (roi >= 15) {
      conversionInsight = `\n\n🔥 *외부 브라우저 전환 ROI: +${roi.toFixed(1)}%p*\n• 인앱 유지 성공률: ${conversionStats.stayedSuccessRate.toFixed(1)}% (n=${conversionStats.stayedTotal.toLocaleString()})\n• 외부 전환 성공률: ${conversionStats.convertedSuccessRate.toFixed(1)}% (n=${conversionStats.convertedTotal.toLocaleString()})\n• *자동 외부 전환 정책 검토 권장*`;
    } else if (roi >= 10) {
      conversionInsight = `\n\n✅ *외부 브라우저 전환 ROI: +${roi.toFixed(1)}%p*\n• 인앱 유지 성공률: ${conversionStats.stayedSuccessRate.toFixed(1)}% (n=${conversionStats.stayedTotal.toLocaleString()})\n• 외부 전환 성공률: ${conversionStats.convertedSuccessRate.toFixed(1)}% (n=${conversionStats.convertedTotal.toLocaleString()})\n• CTA 강화 검토 권장`;
    } else if (roi >= 5) {
      conversionInsight = `\n\n💡 *외부 브라우저 전환 ROI: +${roi.toFixed(1)}%p*\n• 인앱 유지 성공률: ${conversionStats.stayedSuccessRate.toFixed(1)}% (n=${conversionStats.stayedTotal.toLocaleString()})\n• 외부 전환 성공률: ${conversionStats.convertedSuccessRate.toFixed(1)}% (n=${conversionStats.convertedTotal.toLocaleString()})\n• CTA 유지 권장`;
    } else {
      conversionInsight = `\n\n📊 *외부 브라우저 전환 ROI: +${roi.toFixed(1)}%p*\n• 인앱 유지 성공률: ${conversionStats.stayedSuccessRate.toFixed(1)}% (n=${conversionStats.stayedTotal.toLocaleString()})\n• 외부 전환 성공률: ${conversionStats.convertedSuccessRate.toFixed(1)}% (n=${conversionStats.convertedTotal.toLocaleString()})`;
    }
  }

  return {
    text: `📊 AI 분석 성공률 주간 리포트 (${startDate} ~ ${endDate})`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 AI 분석 성공률 주간 리포트`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*기간:*\n${startDate} ~ ${endDate}`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📈 전체 요약*\n• 총 요청: ${summary.total.toLocaleString()}건\n• 성공률: ${summary.successRate.toFixed(1)}% (${summary.success}/${summary.total})\n• 평균 응답 시간: ${(summary.avgLatency / 1000).toFixed(1)}초\n• 느린 요청: ${summary.slowRequests}건 (${summary.slowRate.toFixed(1)}%)`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🌐 환경별 비교*\n• 카카오 인앱: ${byEnvironment.kakaoInApp.successRate.toFixed(1)}% 성공률 (${byEnvironment.kakaoInApp.success}/${byEnvironment.kakaoInApp.total})\n• 모바일 전체: ${byEnvironment.mobile.successRate.toFixed(1)}% 성공률 (${byEnvironment.mobile.success}/${byEnvironment.mobile.total})\n• 데스크탑: ${byEnvironment.desktop.successRate.toFixed(1)}% 성공률 (${byEnvironment.desktop.success}/${byEnvironment.desktop.total})`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⚠️ 주요 에러*\n${Object.entries(byErrorCode)
            .map(([code, count]) => `• ${code}: ${count}건 (${((count / summary.total) * 100).toFixed(1)}%)`)
            .join('\n')}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*💡 인사이트*\n${insight}${conversionInsight || ''}`,
        },
      },
    ],
  };
}

/**
 * 🔥 주간 리포트 실행 (크론잡 엔트리 포인트)
 */
export async function runWeeklyReport() {
  try {
    console.log('📊 [WeeklyReport] 주간 리포트 생성 시작...');

    // 지난 주 월요일 ~ 일요일 계산
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    
    const startTimestamp = lastMonday.getTime();
    const endTimestamp = lastSunday.getTime();

    // 리포트 생성
    const report = await generateWeeklyReport();

    // 🔥 B단계: 전환 통계 조회
    
    const conversionStats = await getConversionStats(startTimestamp, endTimestamp);

    // Slack 전송
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      const slackMessage = formatSlackMessage(report, conversionStats);
      await axios.post(slackWebhookUrl, slackMessage);
      console.log('✅ [WeeklyReport] Slack 전송 완료 (전환 ROI 포함)');
    }

    // 이메일 전송 (선택)
    // const emailRecipients = process.env.REPORT_EMAIL_RECIPIENTS?.split(',') || [];
    // if (emailRecipients.length > 0) {
    //   await sendEmailReport(report, emailRecipients);
    //   console.log('✅ [WeeklyReport] 이메일 전송 완료');
    // }

    console.log('✅ [WeeklyReport] 주간 리포트 완료');
  } catch (error) {
    console.error('❌ [WeeklyReport] 주간 리포트 실패:', error);
    throw error;
  }
}

// 🔥 크론잡 설정 예시 (node-cron)
// import cron from 'node-cron';
// 
// // 매주 월요일 오전 9시 (KST) 실행
// cron.schedule('0 9 * * 1', async () => {
//   await runWeeklyReport();
// });

// 🔥 크론잡 설정 예시 (AWS Lambda + EventBridge)
// export const handler = async (event: any) => {
//   await runWeeklyReport();
//   return { statusCode: 200, body: 'Weekly report completed' };
// };

