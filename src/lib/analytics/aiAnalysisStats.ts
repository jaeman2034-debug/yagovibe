/**
 * 🔥 천재 모드: AI 분석 성공률 통계 유틸리티
 * 
 * 개발 환경에서 성공률을 쉽게 확인할 수 있도록 제공
 */

import { aiAnalysisLogger } from './aiAnalysisLogger';

/**
 * 성공률 통계를 콘솔에 출력 (개발 환경)
 */
export function logAIAnalysisStats(): void {
  if (!import.meta.env.DEV) {
    console.warn('⚠️ [AIAnalysisStats] 개발 환경에서만 사용 가능합니다.');
    return;
  }

  const stats = aiAnalysisLogger.getStats();

  console.log('='.repeat(80));
  console.log('📊 [천재 모드] AI 분석 성공률 통계');
  console.log('='.repeat(80));
  console.log(`전체 요청: ${stats.total}건`);
  console.log(`성공: ${stats.success}건 (${stats.successRate.toFixed(1)}%)`);
  console.log(`실패: ${stats.failed}건`);
  console.log(`평균 응답 시간: ${stats.avgLatency.toFixed(0)}ms`);
  console.log(`느린 요청 (4초 이상): ${stats.slowRequests}건 (${stats.slowRate.toFixed(1)}%)`);
  console.log('');
  console.log('환경별 통계:');
  console.log(`  카카오 인앱: ${stats.byEnv.kakaoInApp.total}건 (성공: ${stats.byEnv.kakaoInApp.success}건, 성공률: ${stats.byEnv.kakaoInApp.successRate.toFixed(1)}%)`);
  console.log(`  모바일: ${stats.byEnv.mobile.total}건 (성공: ${stats.byEnv.mobile.success}건, 성공률: ${stats.byEnv.mobile.successRate.toFixed(1)}%)`);
  console.log(`  데스크탑: ${stats.byEnv.desktop.total}건 (성공: ${stats.byEnv.desktop.success}건, 성공률: ${stats.byEnv.desktop.successRate.toFixed(1)}%)`);
  console.log('='.repeat(80));
  
  // localStorage에서 최근 로그 확인
  const logs = JSON.parse(localStorage.getItem('ai_analysis_logs') || '[]');
  if (logs.length > 0) {
    console.log(`\n📋 최근 로그 (최대 10개):`);
    logs.slice(-10).forEach((log: any, index: number) => {
      console.log(`${index + 1}. ${log.result.success ? '✅' : '❌'} ${log.result.latency}ms (재시도: ${log.result.retryCount}회, 환경: ${log.env.isKakaoInApp ? '카카오' : log.env.isMobile ? '모바일' : '데스크탑'})`);
    });
  }
}

/**
 * 성공률 통계를 JSON으로 반환
 */
export function getAIAnalysisStatsJSON(): string {
  const stats = aiAnalysisLogger.getStats();
  return JSON.stringify(stats, null, 2);
}

// 개발 환경에서 전역 함수로 노출
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).getAIAnalysisStats = logAIAnalysisStats;
  (window as any).getAIAnalysisStatsJSON = getAIAnalysisStatsJSON;
  console.log('💡 [천재 모드] 개발 도구: window.getAIAnalysisStats() 호출 시 통계 확인 가능');
}

