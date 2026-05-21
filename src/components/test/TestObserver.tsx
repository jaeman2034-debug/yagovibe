/**
 * 🔥 Phase 29: 테스트 관찰 도구
 * 
 * 실전 테스트 시 사용자 행동을 기록하는 도구
 * 개발 모드에서만 활성화
 */
import React, { useState, useEffect } from 'react';

type TestEvent = {
  timestamp: number;
  event: string;
  data?: any;
};

type Props = {
  testerName?: string;
  enabled?: boolean;
};

export default function TestObserver({ testerName = 'Tester', enabled = false }: Props) {
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // 🔥 Phase 29: 테스트 시작
  const startTest = () => {
    setStartTime(Date.now());
    setIsRecording(true);
    addEvent('test_started', { testerName });
  };

  // 🔥 Phase 29: 이벤트 기록
  const addEvent = (event: string, data?: any) => {
    if (!isRecording) return;
    
    const newEvent: TestEvent = {
      timestamp: Date.now(),
      event,
      data,
    };
    
    setEvents(prev => [...prev, newEvent]);
    console.log(`[TestObserver] ${event}:`, data);
  };

  // 🔥 Phase 29: 테스트 종료 및 결과 출력
  const endTest = () => {
    setIsRecording(false);
    addEvent('test_ended');
    
    // 결과 요약
    const duration = startTime ? (Date.now() - startTime) / 1000 : 0;
    const firstSpeech = events.find(e => e.event === 'user_speech');
    const firstSpeechTime = firstSpeech && startTime 
      ? (firstSpeech.timestamp - startTime) / 1000 
      : null;
    
    console.log('=== Phase 29 테스트 결과 ===');
    console.log(`테스터: ${testerName}`);
    console.log(`총 시간: ${duration.toFixed(1)}초`);
    console.log(`첫 발화 시간: ${firstSpeechTime ? `${firstSpeechTime.toFixed(1)}초` : '없음'}`);
    console.log(`총 이벤트: ${events.length}개`);
    console.log('========================');
  };

  // 🔥 Phase 29: 결과 다운로드
  const downloadResults = () => {
    const results = {
      testerName,
      startTime,
      endTime: Date.now(),
      events,
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${testerName}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 🔥 Phase 29: 전역 이벤트 리스너 (개발 모드에서만)
  useEffect(() => {
    if (!enabled || process.env.NODE_ENV !== 'development') return;

    // STT 이벤트 감지
    const handleSpeech = (e: CustomEvent) => {
      addEvent('user_speech', { text: e.detail });
    };

    // 추천 표시 감지
    const handleRecommendation = (e: CustomEvent) => {
      addEvent('recommendation_shown', { place: e.detail });
    };

    // 네비게이션 시작 감지
    const handleNavigationStart = () => {
      addEvent('navigation_started');
    };

    // 네비게이션 중지 감지
    const handleNavigationStop = () => {
      addEvent('navigation_stopped');
    };

    // 기억 저장 감지
    const handleMemorySave = () => {
      addEvent('memory_saved');
    };

    window.addEventListener('test:speech', handleSpeech as EventListener);
    window.addEventListener('test:recommendation', handleRecommendation as EventListener);
    window.addEventListener('test:navigation:start', handleNavigationStart);
    window.addEventListener('test:navigation:stop', handleNavigationStop);
    window.addEventListener('test:memory:save', handleMemorySave);

    return () => {
      window.removeEventListener('test:speech', handleSpeech as EventListener);
      window.removeEventListener('test:recommendation', handleRecommendation as EventListener);
      window.removeEventListener('test:navigation:start', handleNavigationStart);
      window.removeEventListener('test:navigation:stop', handleNavigationStop);
      window.removeEventListener('test:memory:save', handleMemorySave);
    };
  }, [enabled, isRecording]);

  if (!enabled || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="test-observer">
      <div className="test-observer-header">
        <h3>Phase 29 테스트 관찰</h3>
        <div className="test-observer-status">
          {isRecording ? (
            <span className="recording">● 녹음 중</span>
          ) : (
            <span className="idle">대기 중</span>
          )}
        </div>
      </div>

      <div className="test-observer-controls">
        {!isRecording ? (
          <button onClick={startTest} className="test-btn-start">
            테스트 시작
          </button>
        ) : (
          <>
            <button onClick={endTest} className="test-btn-end">
              테스트 종료
            </button>
            <button onClick={downloadResults} className="test-btn-download">
              결과 다운로드
            </button>
          </>
        )}
      </div>

      <div className="test-observer-stats">
        <div>이벤트: {events.length}개</div>
        {(() => {
          const firstSpeech = events.find(e => e.event === 'user_speech');
          const firstSpeechTime = firstSpeech && startTime 
            ? (firstSpeech.timestamp - startTime) / 1000 
            : null;
          return firstSpeechTime !== null ? (
            <div>첫 발화: {firstSpeechTime.toFixed(1)}초</div>
          ) : null;
        })()}
      </div>

      <div className="test-observer-events">
        {events.slice(-10).map((event, index) => (
          <div key={index} className="test-event">
            <span className="test-event-time">
              {startTime ? ((event.timestamp - startTime) / 1000).toFixed(1) : '0'}초
            </span>
            <span className="test-event-name">{event.event}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
