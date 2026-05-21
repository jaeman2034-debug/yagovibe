/**
 * 🔥 Post-Launch: 공개 이후 14일 운영 플랜 분석
 * 
 * 목적: 초기 사용 신호를 '습관 가능성'으로 전환할지 판단
 */

import { logEvent } from './mapTestAnalytics';

/**
 * Day 3-7: 재방문 신호 확인
 */
export function analyzeReturningSignals(): {
  returnRate24h: number; // 24시간 내 재방문율
  avgTimeToSecondUtterance: number; // 두 번째 발화까지 평균 시간 (ms)
  secondUtteranceWithin30s: number; // 30초 이내 두 번째 발화 비율
  totalReturningUsers: number; // 재방문 사용자 수
} {
  const events = JSON.parse(localStorage.getItem('map_test_events') || '[]') as any[];
  
  if (events.length === 0) {
    return {
      returnRate24h: 0,
      avgTimeToSecondUtterance: 0,
      secondUtteranceWithin30s: 0,
      totalReturningUsers: 0,
    };
  }
  
  // 재방문 이벤트 분석
  const returningEvents = events.filter(e => e.event === 'user_returned');
  const totalSessions = new Set(events.map(e => e.session_id)).size;
  const returnRate24h = totalSessions > 0 ? returningEvents.length / totalSessions : 0;
  
  // 두 번째 발화 분석
  const secondUtterances = events.filter(e => 
    e.event === 'stt_transcript_received' && e.is_second_utterance === true
  );
  const timeToSecondUtterance = secondUtterances
    .map(e => e.time_since_last_ms || 0)
    .filter(t => t > 0);
  const avgTimeToSecondUtterance = timeToSecondUtterance.length > 0
    ? timeToSecondUtterance.reduce((sum, t) => sum + t, 0) / timeToSecondUtterance.length
    : 0;
  
  // 30초 이내 두 번째 발화 비율
  const within30s = secondUtterances.filter(e => 
    (e.time_since_last_ms || 0) <= 30000
  ).length;
  const secondUtteranceWithin30s = secondUtterances.length > 0
    ? within30s / secondUtterances.length
    : 0;
  
  return {
    returnRate24h,
    avgTimeToSecondUtterance,
    secondUtteranceWithin30s,
    totalReturningUsers: returningEvents.length,
  };
}

/**
 * Day 8-14: 습관 가능성 판정
 */
export function analyzeHabitSignals(): {
  idleWaitRate: number; // 앱 켜고 아무 말 없이 기다리는 비율
  mapIgnoreRate: number; // 지도 안 보고 AI 멘트만 듣는 비율
  exploratoryQueryRate: number; // 목적 없이 "근처 뭐 있어?" 같은 탐색 질문 비율
  purposeDrivenRate: number; // 특정 목적으로만 사용하는 비율
  habitScore: number; // 습관 가능성 점수 (0-1)
} {
  const events = JSON.parse(localStorage.getItem('map_test_events') || '[]') as any[];
  
  if (events.length === 0) {
    return {
      idleWaitRate: 0,
      mapIgnoreRate: 0,
      exploratoryQueryRate: 0,
      purposeDrivenRate: 0,
      habitScore: 0,
    };
  }
  
  // 세션별 분석
  const sessions = new Map<string, any[]>();
  events.forEach(event => {
    const sessionId = event.session_id;
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    sessions.get(sessionId)!.push(event);
  });
  
  // 앱 켜고 아무 말 없이 기다리는 비율 (세션 시작 후 5초 이상 지나서 첫 발화)
  let idleWaitCount = 0;
  let exploratoryQueryCount = 0;
  let purposeDrivenCount = 0;
  let mapIgnoreCount = 0;
  
  Array.from(sessions.values()).forEach(sessionEvents => {
    const firstSTT = sessionEvents.find(e => e.event === 'stt_listen_start');
    const firstTranscript = sessionEvents.find(e => e.event === 'stt_transcript_received');
    const mapInteractions = sessionEvents.filter(e => 
      e.event === 'map_pan' || e.event === 'map_zoom'
    );
    
    // 5초 이상 기다린 후 첫 발화
    if (firstSTT && firstTranscript) {
      const waitTime = firstTranscript.timestamp - firstSTT.timestamp;
      if (waitTime > 5000) {
        idleWaitCount++;
      }
    }
    
    // 지도 조작 없이 AI만 사용
    if (firstTranscript && mapInteractions.length === 0) {
      mapIgnoreCount++;
    }
    
    // 탐색 질문 패턴 ("근처", "뭐 있어", "어디", "보여줘" 등)
    if (firstTranscript) {
      const transcript = (firstTranscript.transcript || '').toLowerCase();
      const exploratoryKeywords = ['근처', '뭐 있어', '어디', '보여줘', '추천', '주변'];
      const isExploratory = exploratoryKeywords.some(keyword => transcript.includes(keyword));
      
      if (isExploratory) {
        exploratoryQueryCount++;
      } else {
        purposeDrivenCount++;
      }
    }
  });
  
  const totalSessions = sessions.size;
  const idleWaitRate = totalSessions > 0 ? idleWaitCount / totalSessions : 0;
  const mapIgnoreRate = totalSessions > 0 ? mapIgnoreCount / totalSessions : 0;
  const exploratoryQueryRate = totalSessions > 0 ? exploratoryQueryCount / totalSessions : 0;
  const purposeDrivenRate = totalSessions > 0 ? purposeDrivenCount / totalSessions : 0;
  
  // 습관 점수 계산 (0-1)
  // - idleWaitRate 높을수록 좋음 (0.3 이상)
  // - mapIgnoreRate 높을수록 좋음 (0.2 이상)
  // - exploratoryQueryRate 높을수록 좋음 (0.4 이상)
  // - purposeDrivenRate 낮을수록 좋음 (0.5 이하)
  const habitScore = Math.min(1, (
    (idleWaitRate >= 0.3 ? 0.3 : idleWaitRate / 0.3 * 0.3) +
    (mapIgnoreRate >= 0.2 ? 0.2 : mapIgnoreRate / 0.2 * 0.2) +
    (exploratoryQueryRate >= 0.4 ? 0.3 : exploratoryQueryRate / 0.4 * 0.3) +
    (purposeDrivenRate <= 0.5 ? 0.2 : (1 - purposeDrivenRate) / 0.5 * 0.2)
  ));
  
  return {
    idleWaitRate,
    mapIgnoreRate,
    exploratoryQueryRate,
    purposeDrivenRate,
    habitScore,
  };
}

/**
 * Post-Launch 의사결정 트리
 */
export function evaluatePostLaunchDecision(): {
  decision: 'EXPAND' | 'REPOSITION' | 'PAUSE';
  reason: string;
  signals: {
    returning: ReturnType<typeof analyzeReturningSignals>;
    habit: ReturnType<typeof analyzeHabitSignals>;
  };
} {
  const returning = analyzeReturningSignals();
  const habit = analyzeHabitSignals();
  
  // CASE 1: 습관 신호 있음 (2개 이상)
  const habitSignals = [
    habit.idleWaitRate >= 0.3,
    habit.mapIgnoreRate >= 0.2,
    habit.exploratoryQueryRate >= 0.4,
  ].filter(Boolean).length;
  
  if (habitSignals >= 2 && habit.habitScore >= 0.6) {
    return {
      decision: 'EXPAND',
      reason: `✅ 습관 신호 확인 (${habitSignals}/3, 점수: ${habit.habitScore.toFixed(2)})`,
      signals: { returning, habit },
    };
  }
  
  // CASE 2: 기능은 쓰나 습관은 약함
  if (returning.returnRate24h >= 0.15 && habit.habitScore < 0.6) {
    return {
      decision: 'REPOSITION',
      reason: `⚠️ 재방문은 있으나 습관 신호 약함 (재방문율: ${(returning.returnRate24h * 100).toFixed(1)}%, 습관 점수: ${habit.habitScore.toFixed(2)})`,
      signals: { returning, habit },
    };
  }
  
  // CASE 3: 반응 미미
  return {
    decision: 'PAUSE',
    reason: `❌ 반응 미미 (재방문율: ${(returning.returnRate24h * 100).toFixed(1)}%, 습관 점수: ${habit.habitScore.toFixed(2)})`,
    signals: { returning, habit },
  };
}
