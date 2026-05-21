/**
 * 🔥 천재 모드: AI 분석 성공률 로깅 시스템
 * 
 * 원칙: 로그는 기능이 아니라 자산
 * - 체감 성공률 ↑
 * - 문제 재현 없이 원인 파악 가능
 * - "안 된다"는 CS가 숫자로 바뀜
 */

// 🔥 운영 안정성: 로그 용량 가드
const MAX_LOGS = 200; // 최대 200개 로그 유지 (장기 사용 시 브라우저 성능 보호)
const MAX_EVENTS = 500; // 🔥 관측 지표: 최대 500개 이벤트 유지

// 🔥 지표 해석용: latency 기준선
const SLOW_THRESHOLD = 4000; // 4초 이상이면 "느림"으로 분류

export interface AIAnalysisLog {
  // 환경 정보 (명시적 선언)
  env: {
    isKakaoInApp: boolean;
    isMobile: boolean;
    userAgent: string;
    platform: string;
  };

  // 요청 정보
  request: {
    endpoint: string;
    fileSize: number;
    fileType: string;
    hasAuth: boolean;
    timestamp: number;
  };

  // 결과 정보
  result: {
    success: boolean;
    errorCode?: string;
    latency: number; // ms
    retryCount: number;
    httpStatus?: number;
    isSlow?: boolean; // 🔥 4초 이상 요청 플래그
  };

  // 메타 정보
  meta: {
    sessionId: string;
    userId?: string;
    flowId?: string; // 🔥 B단계: 인앱 → 외부 브라우저 전환 추적
    flow?: string; // 'INAPP_TO_EXTERNAL'
    source?: string; // 'AI_ANALYSIS_FAILURE'
    environment?: string; // 'INAPP_BROWSER' | 'EXTERNAL_BROWSER'
  };
}

/**
 * 환경 정보 수집 (명시적 선언)
 */
function getEnvInfo() {
  const userAgent = navigator.userAgent;
  const isKakaoInApp = /KAKAOTALK/i.test(userAgent);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  let platform = 'unknown';
  if (/Android/i.test(userAgent)) platform = 'android';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = 'ios';
  else if (/Windows/i.test(userAgent)) platform = 'windows';
  else if (/Mac/i.test(userAgent)) platform = 'mac';
  else if (/Linux/i.test(userAgent)) platform = 'linux';

  return {
    isKakaoInApp,
    isMobile,
    userAgent,
    platform,
  };
}

/**
 * 세션 ID 생성 (브라우저 세션 기준)
 */
function getSessionId(): string {
  const key = 'ai_analysis_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

/**
 * AI 분석 로그 수집 및 전송
 */
export class AIAnalysisLogger {
  private static instance: AIAnalysisLogger;
  private logs: AIAnalysisLog[] = [];
  private readonly BATCH_SIZE = 10; // 10개씩 배치 전송
  private readonly FLUSH_INTERVAL = 30000; // 30초마다 자동 전송

  private constructor() {
    // 주기적 자동 전송
    setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  static getInstance(): AIAnalysisLogger {
    if (!AIAnalysisLogger.instance) {
      AIAnalysisLogger.instance = new AIAnalysisLogger();
    }
    return AIAnalysisLogger.instance;
  }

  /**
   * AI 분석 시작 로그
   */
  logStart(params: {
    endpoint: string;
    fileSize: number;
    fileType: string;
    hasAuth: boolean;
    userId?: string;
  }): { startTime: number; logId: string } {
    const startTime = Date.now();
    const logId = `log_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
    
    const log: Partial<AIAnalysisLog> = {
      env: getEnvInfo(),
      request: {
        endpoint: params.endpoint,
        fileSize: params.fileSize,
        fileType: params.fileType,
        hasAuth: params.hasAuth,
        timestamp: startTime,
      },
      meta: {
        sessionId: getSessionId(),
        userId: params.userId,
      },
    };

    // 임시 저장 (완료 시 업데이트)
    (window as any).__aiAnalysisLogs = (window as any).__aiAnalysisLogs || {};
    (window as any).__aiAnalysisLogs[logId] = { log, startTime };

    return { startTime, logId };
  }

  /**
   * AI 분석 완료 로그
   */
  logComplete(logId: string, params: {
    success: boolean;
    errorCode?: string;
    retryCount: number;
    httpStatus?: number;
    userId?: string;
    flowId?: string; // 🔥 B단계: 전환 추적
    environment?: string; // 🔥 B단계: 환경 구분
  }): void {
    const temp = (window as any).__aiAnalysisLogs?.[logId];
    if (!temp) {
      console.warn('⚠️ [AIAnalysisLogger] logId를 찾을 수 없음:', logId);
      return;
    }

    const latency = Date.now() - temp.startTime;
    const isSlow = latency > SLOW_THRESHOLD; // 🔥 지표 해석용: 느린 요청 분류
    
    const log: AIAnalysisLog = {
      ...temp.log,
      result: {
        success: params.success,
        errorCode: params.errorCode,
        latency,
        retryCount: params.retryCount,
        httpStatus: params.httpStatus,
        isSlow, // 🔥 느린 요청 플래그 추가
      },
      meta: {
        ...temp.log.meta,
        userId: params.userId || temp.log.meta.userId,
        flowId: params.flowId || temp.log.meta.flowId, // 🔥 B단계: flowId 유지
        environment: params.environment || temp.log.meta.environment, // 🔥 B단계: 환경 구분
      },
    } as AIAnalysisLog;

    // 로그 저장
    this.logs.push(log);

    // 임시 데이터 정리
    delete (window as any).__aiAnalysisLogs[logId];

    // 즉시 전송 (실패는 배치로)
    if (params.success) {
      this.sendLog(log);
    } else {
      // 실패는 배치로 모아서 전송 (성공률 분석용)
      if (this.logs.length >= this.BATCH_SIZE) {
        this.flush();
      }
    }

    // 콘솔 로그 (개발 환경)
    if (import.meta.env.DEV) {
      console.log('📊 [AIAnalysisLogger] 분석 완료:', {
        success: params.success,
        latency: `${latency}ms`,
        retryCount: params.retryCount,
        env: log.env,
      });
    }
  }

  /**
   * 로그 전송 (서버 또는 로컬 저장)
   */
  private async sendLog(log: AIAnalysisLog): Promise<void> {
    try {
      // TODO: 서버 엔드포인트로 전송
      // const response = await fetch('/api/analytics/ai-analysis', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(log),
      // });

      // 현재는 로컬 저장 (개발 환경)
      if (import.meta.env.DEV) {
        const existingLogs = JSON.parse(localStorage.getItem('ai_analysis_logs') || '[]');
        const nextLogs = [...existingLogs, log];
        // 🔥 운영 안정성: 최대 200개만 유지 (장기 사용 시 브라우저 성능 보호)
        const recentLogs = nextLogs.slice(-MAX_LOGS);
        localStorage.setItem('ai_analysis_logs', JSON.stringify(recentLogs));
      }
    } catch (error) {
      console.warn('⚠️ [AIAnalysisLogger] 로그 전송 실패:', error);
      // 실패해도 앱은 정상 작동
    }
  }

  /**
   * 배치 로그 전송
   */
  private async flush(): Promise<void> {
    if (this.logs.length === 0) return;

    const logsToSend = [...this.logs];
    this.logs = [];

    try {
      // TODO: 서버 엔드포인트로 배치 전송
      // await fetch('/api/analytics/ai-analysis/batch', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logsToSend),
      // });

      // 현재는 로컬 저장
      if (import.meta.env.DEV) {
        const existingLogs = JSON.parse(localStorage.getItem('ai_analysis_logs') || '[]');
        const allLogs = [...existingLogs, ...logsToSend];
        // 🔥 운영 안정성: 최대 200개만 유지
        const recentLogs = allLogs.slice(-MAX_LOGS);
        localStorage.setItem('ai_analysis_logs', JSON.stringify(recentLogs));
      }
    } catch (error) {
      console.warn('⚠️ [AIAnalysisLogger] 배치 전송 실패:', error);
      // 실패한 로그는 다시 큐에 추가
      this.logs.unshift(...logsToSend);
    }
  }

  /**
   * 🔥 관측 지표: 범용 이벤트 로깅 (summary_view_duration, retry_click 등)
   */
  logEvent(eventType: string, params: {
    metric: string;
    confidenceLevel?: string;
    environment?: string;
    durationMs?: number;
    [key: string]: any;
  }): void {
    const eventLog = {
      eventType,
      timestamp: Date.now(),
      env: getEnvInfo(),
      metric: params.metric,
      confidenceLevel: params.confidenceLevel,
      environment: params.environment,
      durationMs: params.durationMs,
      ...params,
    };

    // 로컬 저장 (개발 환경)
    if (import.meta.env.DEV) {
      const existingEvents = JSON.parse(localStorage.getItem('ai_observation_events') || '[]');
      const nextEvents = [...existingEvents, eventLog];
      // 🔥 운영 안정성: 최대 500개만 유지 (장기 관측 시 브라우저 성능 보호)
      const recentEvents = nextEvents.slice(-MAX_EVENTS);
      localStorage.setItem('ai_observation_events', JSON.stringify(recentEvents));
    }

    // 콘솔 로그 (개발 환경)
    if (import.meta.env.DEV) {
      console.log(`📊 [관측 지표] ${eventType}:`, params);
    }

    // TODO: 서버 엔드포인트로 전송
    // await fetch('/api/analytics/ai-observation', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(eventLog),
    // });
  }

  /**
   * 성공률 통계 조회 (로컬 저장된 로그 기준)
   */
  getStats(): {
    total: number;
    success: number;
    failed: number;
    successRate: number;
    avgLatency: number;
    slowRequests: number; // 🔥 4초 이상 요청 수
    slowRate: number; // 🔥 느린 요청 비율
    byEnv: {
      kakaoInApp: { total: number; success: number; successRate: number };
      mobile: { total: number; success: number; successRate: number };
      desktop: { total: number; success: number; successRate: number };
    };
  } {
    const logs = JSON.parse(localStorage.getItem('ai_analysis_logs') || '[]') as AIAnalysisLog[];
    
    const total = logs.length;
    const success = logs.filter(l => l.result.success).length;
    const failed = total - success;
    const successRate = total > 0 ? (success / total) * 100 : 0;
    const avgLatency = logs.length > 0
      ? logs.reduce((sum, l) => sum + l.result.latency, 0) / logs.length
      : 0;
    
    // 🔥 지표 해석용: 느린 요청 통계
    const slowRequests = logs.filter(l => l.result.isSlow).length;
    const slowRate = total > 0 ? (slowRequests / total) * 100 : 0;

    const byEnv = {
      kakaoInApp: {
        total: logs.filter(l => l.env.isKakaoInApp).length,
        success: logs.filter(l => l.env.isKakaoInApp && l.result.success).length,
        successRate: 0,
      },
      mobile: {
        total: logs.filter(l => l.env.isMobile).length,
        success: logs.filter(l => l.env.isMobile && l.result.success).length,
        successRate: 0,
      },
      desktop: {
        total: logs.filter(l => !l.env.isMobile).length,
        success: logs.filter(l => !l.env.isMobile && l.result.success).length,
        successRate: 0,
      },
    };

    // 환경별 성공률 계산
    if (byEnv.kakaoInApp.total > 0) {
      byEnv.kakaoInApp.successRate = (byEnv.kakaoInApp.success / byEnv.kakaoInApp.total) * 100;
    }
    if (byEnv.mobile.total > 0) {
      byEnv.mobile.successRate = (byEnv.mobile.success / byEnv.mobile.total) * 100;
    }
    if (byEnv.desktop.total > 0) {
      byEnv.desktop.successRate = (byEnv.desktop.success / byEnv.desktop.total) * 100;
    }

    return {
      total,
      success,
      failed,
      successRate,
      avgLatency,
      slowRequests,
      slowRate,
      byEnv,
    };
  }
}

// 싱글톤 인스턴스 export
// 🔒 지연 초기화로 변경 (import 시점 오류 방지)
let _aiAnalysisLoggerInstance: AIAnalysisLogger | null = null;

function getAIAnalysisLoggerInstance(): AIAnalysisLogger {
  if (!_aiAnalysisLoggerInstance) {
    _aiAnalysisLoggerInstance = AIAnalysisLogger.getInstance();
  }
  return _aiAnalysisLoggerInstance;
}

// 🔒 모든 메서드를 지연 초기화로 래핑
export const aiAnalysisLogger = {
  logStart: (params: {
    endpoint: string;
    fileSize: number;
    fileType: string;
    hasAuth: boolean;
    userId?: string;
  }): { startTime: number; logId: string } => {
    return getAIAnalysisLoggerInstance().logStart(params);
  },
  logComplete: (logId: string, params: {
    success: boolean;
    errorCode?: string;
    retryCount: number;
    httpStatus?: number;
    userId?: string;
    flowId?: string;
    environment?: string;
  }): void => {
    return getAIAnalysisLoggerInstance().logComplete(logId, params);
  },
  logEvent: (eventType: string, params: Record<string, any>): void => {
    return getAIAnalysisLoggerInstance().logEvent(eventType, params);
  },
  getStats: (): {
    total: number;
    success: number;
    failed: number;
    successRate: number;
    avgLatency: number;
    slowRequests: number;
    slowRate: number;
    byEnv: {
      kakaoInApp: { total: number; success: number; successRate: number };
      mobile: { total: number; success: number; successRate: number };
      desktop: { total: number; success: number; successRate: number };
    };
  } => {
    return getAIAnalysisLoggerInstance().getStats();
  },
};

