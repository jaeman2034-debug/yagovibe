/**
 * 🔥 기능 테스트 계측 (Instrumentation)
 * 
 * 목적: "이 UX가 '작동한다'고 말할 수 있는 최소 증거를 만든다"
 * 원칙: 감각 ❌ / 의견 ❌ / 행동 데이터 ⭕
 */

// 세션 ID 생성 (앱 열릴 때마다 새로 생성)
let sessionId: string | null = null;
let appOpenTime: number | null = null;

// 🔥 Post-Launch: 재방문 추적 (24시간 내 재방문 감지)
const LAST_SESSION_KEY = 'map_last_session_id';
const LAST_SESSION_TIME_KEY = 'map_last_session_time';

/**
 * 세션 초기화 (앱 열릴 때 호출)
 * 🔥 Post-Launch: 재방문 감지 포함
 */
export function initTestSession(): void {
  const now = Date.now();
  const lastSessionId = localStorage.getItem(LAST_SESSION_KEY);
  const lastSessionTime = parseInt(localStorage.getItem(LAST_SESSION_TIME_KEY) || '0');
  
  // 24시간 내 재방문 감지
  const isReturning = lastSessionId && lastSessionTime && (now - lastSessionTime) < 24 * 60 * 60 * 1000;
  
  sessionId = `session_${now}_${Math.random().toString(36).substr(2, 9)}`;
  appOpenTime = now;
  
  // 재방문 이벤트 로깅
  if (isReturning) {
    logEvent('user_returned', {
      phase: 'idle',
      hours_since_last: Math.round((now - lastSessionTime) / (60 * 60 * 1000)),
      last_session_id: lastSessionId,
    });
  }
  
  // 현재 세션 정보 저장
  localStorage.setItem(LAST_SESSION_KEY, sessionId);
  localStorage.setItem(LAST_SESSION_TIME_KEY, String(now));
  
  console.log('📊 [TestAnalytics] 세션 시작:', sessionId, isReturning ? '(재방문)' : '(신규)');
}

/**
 * 현재 세션 정보 가져오기
 */
function getSessionInfo(): { session_id: string; time_from_app_open_ms: number } {
  if (!sessionId || !appOpenTime) {
    initTestSession();
  }
  return {
    session_id: sessionId!,
    time_from_app_open_ms: Date.now() - (appOpenTime || Date.now()),
  };
}

/**
 * 현재 Phase 가져오기
 */
function getCurrentPhase(
  sttStatus?: string,
  searchStatus?: string,
  hasRecommendation?: boolean,
  navigationStarted?: boolean
): string {
  if (navigationStarted) return 'navigation';
  if (hasRecommendation) return 'recommendation';
  if (searchStatus === 'searching') return 'searching';
  if (sttStatus === 'listening') return 'listening';
  return 'idle';
}

/**
 * 이벤트 로깅 (공통 포맷)
 */
function logEvent(
  eventName: string,
  params?: Record<string, any>
): void {
  const sessionInfo = getSessionInfo();
  const event = {
    event: eventName,
    ...sessionInfo,
    phase: params?.phase || 'unknown',
    timestamp: Date.now(),
    ...params,
  };

  // 개발 환경: console.log
  if (import.meta.env.DEV) {
    console.log('📊 [TestAnalytics]', event);
  }

  // 🔥 Soft Launch: localStorage에 저장 (최대 1000개 이벤트)
  try {
    const stored = localStorage.getItem('map_test_events');
    const events = stored ? JSON.parse(stored) : [];
    events.push(event);
    
    // 최대 1000개만 유지 (오래된 것부터 삭제)
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
    
    localStorage.setItem('map_test_events', JSON.stringify(events));
  } catch (error) {
    console.warn('⚠️ [TestAnalytics] localStorage 저장 실패:', error);
  }

  // 프로덕션: 기존 analytics 시스템에 연결
  if (import.meta.env.PROD) {
    try {
      import('@/lib/analytics').then((module) => {
        if (module.track) {
          module.track(eventName, event);
        }
      }).catch(() => {
        // analytics 모듈이 없어도 무시
      });
    } catch (error) {
      // 에러 무시
    }
  }
}

// ============================================
// 필수 계측 이벤트
// ============================================

/**
 * STT 듣기 시작
 */
export function trackSTTListenStart(
  sttStatus?: string,
  searchStatus?: string,
  hasRecommendation?: boolean,
  navigationStarted?: boolean
): void {
  logEvent('stt_listen_start', {
    phase: getCurrentPhase(sttStatus, searchStatus, hasRecommendation, navigationStarted),
  });
}

/**
 * STT 전사 결과 수신
 */
export function trackSTTTranscriptReceived(
  text: string,
  sttStatus?: string,
  searchStatus?: string,
  hasRecommendation?: boolean,
  navigationStarted?: boolean
): void {
  logEvent('stt_transcript_received', {
    phase: getCurrentPhase(sttStatus, searchStatus, hasRecommendation, navigationStarted),
    transcript: text,
    transcript_length: text.length,
  });
}

/**
 * 추천 카드 표시
 */
export function trackRecommendationShown(
  placeName: string,
  distanceM?: number,
  reason?: string,
  sttStatus?: string,
  searchStatus?: string
): void {
  logEvent('recommendation_shown', {
    phase: getCurrentPhase(sttStatus, searchStatus, true, false),
    place_name: placeName,
    distance_m: distanceM,
    reason: reason || 'unknown',
  });
}

/**
 * 추천 수락
 */
export function trackRecommendAccept(
  placeName: string,
  sttStatus?: string,
  searchStatus?: string
): void {
  logEvent('recommend_accept', {
    phase: getCurrentPhase(sttStatus, searchStatus, true, false),
    place_name: placeName,
  });
}

/**
 * 추천 거절
 */
export function trackRecommendReject(
  placeName: string,
  sttStatus?: string,
  searchStatus?: string
): void {
  logEvent('recommend_reject', {
    phase: getCurrentPhase(sttStatus, searchStatus, true, false),
    place_name: placeName,
  });
}

/**
 * 지도 팬 (드래그)
 */
export function trackMapPan(
  sttStatus?: string,
  searchStatus?: string,
  hasRecommendation?: boolean,
  navigationStarted?: boolean
): void {
  logEvent('map_pan', {
    phase: getCurrentPhase(sttStatus, searchStatus, hasRecommendation, navigationStarted),
  });
}

/**
 * 지도 줌
 */
export function trackMapZoom(
  zoomLevel: number,
  sttStatus?: string,
  searchStatus?: string,
  hasRecommendation?: boolean,
  navigationStarted?: boolean
): void {
  logEvent('map_zoom', {
    phase: getCurrentPhase(sttStatus, searchStatus, hasRecommendation, navigationStarted),
    zoom_level: zoomLevel,
  });
}

/**
 * 지도 조작 후 음성 복귀
 */
export function trackVoiceAfterMap(
  sttStatus?: string,
  searchStatus?: string
): void {
  logEvent('voice_after_map', {
    phase: getCurrentPhase(sttStatus, searchStatus, false, false),
  });
}

/**
 * 네비게이션 시작
 */
export function trackNavigationStart(
  placeName: string,
  sttStatus?: string,
  searchStatus?: string
): void {
  logEvent('navigation_start', {
    phase: getCurrentPhase(sttStatus, searchStatus, true, true),
    place_name: placeName,
  });
}

/**
 * 세션 이탈 (페이지 종료 시)
 */
export function trackSessionEnd(
  reason: 'unload' | 'navigation' | 'error' = 'unload',
  lastPhase?: string
): void {
  logEvent('session_end', {
    phase: lastPhase || 'unknown',
    reason,
  });
}

/**
 * 에러 발생 (STT/네트워크)
 */
export function trackError(
  errorType: 'stt' | 'network' | 'search' | 'navigation' | 'other',
  errorMessage: string,
  phase?: string
): void {
  logEvent('error_occurred', {
    phase: phase || 'unknown',
    error_type: errorType,
    error_message: errorMessage,
  });
}

// ============================================
// GO/NO-GO 판정 유틸리티
// ============================================

/**
 * 테스트 결과 분석 (로컬 저장된 이벤트 기준)
 */
export function analyzeTestResults(): {
  totalSessions: number;
  sttStartRate: number; // 말부터 시작한 비율
  recommendationActionRate: number; // 추천 카드 노출 후 3초 이내 행동 비율
  rejectRetryRate: number; // 추천 거절 후 재시도 비율
  mapToVoiceRate: number; // 지도 조작 후 음성 복귀 비율
  confusionCount: number; // "이거 뭐지?" 정체 발화 횟수
} {
  // TODO: 실제로는 서버에서 이벤트를 수집하여 분석
  // 지금은 구조만 제공
  return {
    totalSessions: 0,
    sttStartRate: 0,
    recommendationActionRate: 0,
    rejectRetryRate: 0,
    mapToVoiceRate: 0,
    confusionCount: 0,
  };
}

/**
 * GO/NO-GO 판정
 */
export function evaluateGoNoGo(results: ReturnType<typeof analyzeTestResults>): {
  go: boolean;
  reason: string;
  criteria: {
    sttStartRate: boolean;
    recommendationActionRate: boolean;
    rejectRetryRate: boolean;
    mapToVoiceRate: boolean;
    confusionCount: boolean;
  };
} {
  const criteria = {
    sttStartRate: results.sttStartRate >= 0.6, // 60%+
    recommendationActionRate: results.recommendationActionRate >= 0.7, // 70%+ (3초 이내 행동)
    rejectRetryRate: results.rejectRetryRate >= 0.4, // 40%+
    mapToVoiceRate: results.mapToVoiceRate >= 0.3, // 30%+
    confusionCount: results.confusionCount <= 1, // 1회 이하
  };

  const passedCount = Object.values(criteria).filter(Boolean).length;
  const go = passedCount >= 3; // 3개 이상 충족

  return {
    go,
    reason: go
      ? `✅ GO: ${passedCount}/5 기준 충족`
      : `❌ NO-GO: ${passedCount}/5 기준 충족 (3개 이상 필요)`,
    criteria,
  };
}
