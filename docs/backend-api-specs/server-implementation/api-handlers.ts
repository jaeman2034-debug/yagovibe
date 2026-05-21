/**
 * 🔥 AI 분석 로깅 API 핸들러 (최소 구현)
 * 
 * 프레임워크: Express.js / Fastify / NestJS 등 (예시는 Express.js)
 * DB: PostgreSQL (pg 라이브러리 사용)
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// DB 연결 풀 (환경 변수에서 설정 읽기)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'yago_vibe',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 🔥 타입 정의 (API 스펙과 일치)
interface AIAnalysisLogInput {
  sessionId: string;
  userId?: string;
  timestamp: number;
  env: {
    isKakaoInApp: boolean;
    isMobile: boolean;
    platform: string;
    userAgent: string;
  };
  request: {
    endpoint: string;
    fileSize: number;
    fileType: string;
    hasAuth: boolean;
  };
  result: {
    success: boolean;
    errorCode?: string;
    latency: number;
    retryCount: number;
    httpStatus?: number;
    isSlow?: boolean;
  };
  meta?: {
    sessionId?: string;
    userId?: string;
    flowId?: string; // 🔥 B단계: 전환 추적
    environment?: string; // 🔥 B단계: 환경 구분
    flow?: string;
    source?: string;
  };
}

// 🔥 1. POST /api/analytics/ai-analysis (단일 로그)
export async function createAIAnalysisLog(req: Request, res: Response) {
  try {
    const logData: AIAnalysisLogInput = req.body;

    // 스키마 검증 (간단 버전, 실제로는 Zod/Joi 등 사용 권장)
    if (!logData.sessionId || !logData.timestamp || !logData.env || !logData.request || !logData.result) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '필수 필드가 누락되었습니다.',
      });
    }

    // DB 저장
    const query = `
      INSERT INTO ai_analysis_logs (
        id, session_id, user_id, timestamp,
        env_is_kakao_in_app, env_is_mobile, env_platform, env_user_agent,
        request_endpoint, request_file_size, request_file_type, request_has_auth,
        result_success, result_error_code, result_latency, result_retry_count,
        result_http_status, result_is_slow, meta_flow_id, meta_environment,
        created_at, version
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), 'v1'
      )
      RETURNING id, created_at
    `;

    const logId = uuidv4();
    const values = [
      logId,
      logData.sessionId,
      logData.userId || null,
      logData.timestamp,
      logData.env.isKakaoInApp,
      logData.env.isMobile,
      logData.env.platform,
      logData.env.userAgent,
      logData.request.endpoint,
      logData.request.fileSize,
      logData.request.fileType,
      logData.request.hasAuth,
      logData.result.success,
      logData.result.errorCode || null,
      logData.result.latency,
      logData.result.retryCount,
      logData.result.httpStatus || null,
      logData.result.isSlow || false,
      (logData.meta?.flowId || null) as string | null, // 🔥 B단계: flowId
      (logData.meta?.environment || null) as string | null, // 🔥 B단계: environment
    ];

    const result = await pool.query(query, values);

    return res.status(200).json({
      success: true,
      logId: result.rows[0].id,
      receivedAt: result.rows[0].created_at.toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [createAIAnalysisLog] 에러:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '로그 저장에 실패했습니다.',
    });
  }
}

// 🔥 2. POST /api/analytics/ai-analysis/batch (배치 로그)
export async function createAIAnalysisLogsBatch(req: Request, res: Response) {
  try {
    const { logs }: { logs: AIAnalysisLogInput[] } = req.body;

    // 배치 크기 제한
    if (!Array.isArray(logs) || logs.length === 0 || logs.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'logs 배열은 1~100개 사이여야 합니다.',
      });
    }

    // 트랜잭션으로 일괄 저장
    const client = await pool.connect();
    const logIds: string[] = [];
    const errors: Array<{ index: number; error: string; message: string }> = [];
    let accepted = 0;
    let rejected = 0;

    try {
      await client.query('BEGIN');

      for (let i = 0; i < logs.length; i++) {
        const logData = logs[i];
        const logId = uuidv4();

        try {
          // 스키마 검증
          if (!logData.sessionId || !logData.timestamp || !logData.env || !logData.request || !logData.result) {
            rejected++;
            errors.push({
              index: i,
              error: 'VALIDATION_ERROR',
              message: '필수 필드가 누락되었습니다.',
            });
            continue;
          }

          // DB 저장
          const query = `
            INSERT INTO ai_analysis_logs (
              id, session_id, user_id, timestamp,
              env_is_kakao_in_app, env_is_mobile, env_platform, env_user_agent,
              request_endpoint, request_file_size, request_file_type, request_has_auth,
              result_success, result_error_code, result_latency, result_retry_count,
              result_http_status, result_is_slow, meta_flow_id, meta_environment,
              created_at, version
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), 'v1'
            )
            RETURNING id
          `;

          const values = [
            logId,
            logData.sessionId,
            logData.userId || null,
            logData.timestamp,
            logData.env.isKakaoInApp,
            logData.env.isMobile,
            logData.env.platform,
            logData.env.userAgent,
            logData.request.endpoint,
            logData.request.fileSize,
            logData.request.fileType,
            logData.request.hasAuth,
            logData.result.success,
            logData.result.errorCode || null,
            logData.result.latency,
            logData.result.retryCount,
            logData.result.httpStatus || null,
            logData.result.isSlow || false,
            (logData.meta as any)?.flowId || null, // 🔥 B단계: flowId
            (logData.meta as any)?.environment || null, // 🔥 B단계: environment
          ];

          const result = await client.query(query, values);
          logIds.push(result.rows[0].id);
          accepted++;
        } catch (err: any) {
          rejected++;
          errors.push({
            index: i,
            error: 'SERVER_ERROR',
            message: err.message || 'DB 저장 실패',
          });
        }
      }

      await client.query('COMMIT');

      return res.status(200).json({
        success: true,
        receivedCount: logs.length,
        processedCount: accepted + rejected,
        failedCount: rejected,
        accepted,
        rejected,
        logIds,
        ...(errors.length > 0 && { errors }),
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ [createAIAnalysisLogsBatch] 에러:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '배치 로그 저장에 실패했습니다.',
    });
  }
}

// 🔥 3. GET /api/analytics/ai-analysis/stats (통계 조회)
export async function getAIAnalysisStats(req: Request, res: Response) {
  try {
    const { startDate, endDate, groupBy = 'none' } = req.query;

    // 날짜 검증
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'startDate와 endDate가 필요합니다.',
      });
    }

    const start = new Date(startDate as string).getTime();
    const end = new Date(endDate as string).getTime();

    // 최대 90일 제한
    const maxDays = 90 * 24 * 60 * 60 * 1000;
    if (end - start > maxDays) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '조회 기간은 최대 90일입니다.',
      });
    }

    // 전체 요약 통계
    const summaryQuery = `
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

    const summaryResult = await pool.query(summaryQuery, [start, end]);
    const summary = summaryResult.rows[0];

    const total = parseInt(summary.total) || 0;
    const success = parseInt(summary.success) || 0;
    const failed = parseInt(summary.failed) || 0;
    const avgLatency = parseFloat(summary.avg_latency) || 0;
    const p95Latency = parseFloat(summary.p95_latency) || 0;
    const p99Latency = parseFloat(summary.p99_latency) || 0;
    const slowRequests = parseInt(summary.slow_requests) || 0;

    // 환경별 통계
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

    const envResult = await pool.query(envQuery, [start, end]);

    // 환경별 데이터 구조화
    let kakaoInApp = { total: 0, success: 0, failed: 0, successRate: 0, avgLatency: 0, slowRequests: 0, slowRate: 0 };
    let mobile = { total: 0, success: 0, failed: 0, successRate: 0, avgLatency: 0, slowRequests: 0, slowRate: 0 };
    let desktop = { total: 0, success: 0, failed: 0, successRate: 0, avgLatency: 0, slowRequests: 0, slowRate: 0 };

    for (const row of envResult.rows) {
      const rowTotal = parseInt(row.total) || 0;
      const rowSuccess = parseInt(row.success) || 0;
      const rowFailed = rowTotal - rowSuccess;
      const rowAvgLatency = parseFloat(row.avg_latency) || 0;
      const rowSlowRequests = parseInt(row.slow_requests) || 0;
      const rowSuccessRate = rowTotal > 0 ? (rowSuccess / rowTotal) * 100 : 0;
      const rowSlowRate = rowTotal > 0 ? (rowSlowRequests / rowTotal) * 100 : 0;

      if (row.env_is_kakao_in_app) {
        kakaoInApp.total += rowTotal;
        kakaoInApp.success += rowSuccess;
        kakaoInApp.failed += rowFailed;
        kakaoInApp.avgLatency = (kakaoInApp.avgLatency * kakaoInApp.total + rowAvgLatency * rowTotal) / (kakaoInApp.total + rowTotal);
        kakaoInApp.slowRequests += rowSlowRequests;
      }

      if (row.env_is_mobile) {
        mobile.total += rowTotal;
        mobile.success += rowSuccess;
        mobile.failed += rowFailed;
        mobile.avgLatency = (mobile.avgLatency * mobile.total + rowAvgLatency * rowTotal) / (mobile.total + rowTotal);
        mobile.slowRequests += rowSlowRequests;
      } else {
        desktop.total += rowTotal;
        desktop.success += rowSuccess;
        desktop.failed += rowFailed;
        desktop.avgLatency = (desktop.avgLatency * desktop.total + rowAvgLatency * rowTotal) / (desktop.total + rowTotal);
        desktop.slowRequests += rowSlowRequests;
      }
    }

    // 환경별 성공률 계산
    if (kakaoInApp.total > 0) {
      kakaoInApp.successRate = (kakaoInApp.success / kakaoInApp.total) * 100;
      kakaoInApp.slowRate = (kakaoInApp.slowRequests / kakaoInApp.total) * 100;
    }
    if (mobile.total > 0) {
      mobile.successRate = (mobile.success / mobile.total) * 100;
      mobile.slowRate = (mobile.slowRequests / mobile.total) * 100;
    }
    if (desktop.total > 0) {
      desktop.successRate = (desktop.success / desktop.total) * 100;
      desktop.slowRate = (desktop.slowRequests / desktop.total) * 100;
    }

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

    const errorCodeResult = await pool.query(errorCodeQuery, [start, end]);
    const byErrorCode: Record<string, number> = {};
    for (const row of errorCodeResult.rows) {
      byErrorCode[row.result_error_code] = parseInt(row.count) || 0;
    }

    // 응답 구성
    const response: any = {
      period: {
        startDate: new Date(start).toISOString(),
        endDate: new Date(end).toISOString(),
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
        kakaoInApp,
        mobile,
        desktop,
      },
      byErrorCode,
    };

    // groupBy='day'일 때 일별 통계 추가
    if (groupBy === 'day') {
      const dailyQuery = `
        SELECT 
          DATE(to_timestamp(timestamp / 1000)) as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE result_success = true) as success
        FROM ai_analysis_logs
        WHERE timestamp >= $1 AND timestamp <= $2
        GROUP BY DATE(to_timestamp(timestamp / 1000))
        ORDER BY date ASC
      `;

      const dailyResult = await pool.query(dailyQuery, [start, end]);
      response.byDay = dailyResult.rows.map((row) => ({
        date: row.date.toISOString().split('T')[0],
        total: parseInt(row.total) || 0,
        success: parseInt(row.success) || 0,
        successRate: parseInt(row.total) > 0 ? (parseInt(row.success) / parseInt(row.total)) * 100 : 0,
      }));
    }

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ [getAIAnalysisStats] 에러:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '통계 조회에 실패했습니다.',
    });
  }
}

// 🔥 라우터 설정 예시 (Express.js)
// app.post('/api/analytics/ai-analysis', createAIAnalysisLog);
// app.post('/api/analytics/ai-analysis/batch', createAIAnalysisLogsBatch);
// app.get('/api/analytics/ai-analysis/stats', getAIAnalysisStats);

