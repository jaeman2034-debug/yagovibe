/**
 * 🔥 G-①: AI 분석 결과 신뢰도 계산 시스템
 * 
 * 신뢰도는 "결과가 얼마나 신뢰할 수 있는가"를 나타내며,
 * 재시도 횟수, 응답 시간, 브라우저 환경 등을 종합하여 산출합니다.
 * 
 * v1: 운영/환경 신뢰도만 평가 (결과 품질 평가는 v2에서)
 */

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE';

export interface ConfidenceInput {
  success: boolean;
  retryCount: number;
  latency: number; // ms
  isKakaoInApp?: boolean;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number;           // 0~100
  reasons: string[];       // UI에서 "왜?" 툴팁/보조텍스트에 사용
}

/**
 * AI 분석 결과의 신뢰도를 계산합니다.
 * 
 * @param input 신뢰도 계산에 필요한 입력값
 * @returns 신뢰도 등급, 점수, 이유 배열
 * 
 * @example
 * ```ts
 * const result = computeConfidence({
 *   success: true,
 *   retryCount: 1,
 *   latency: 2500,
 *   isKakaoInApp: true
 * });
 * // { level: 'MEDIUM', score: 60, reasons: ['재시도 1회', '응답 지연(1.5초 초과)', '인앱 브라우저 환경'] }
 * ```
 */
export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];

  // 실패 시 즉시 UNAVAILABLE 반환
  if (!input.success) {
    return { level: 'UNAVAILABLE', score: 0, reasons: ['분석 실패'] };
  }

  let score = 100;

  // Retry penalty
  if (input.retryCount >= 2) {
    score -= 35;
    reasons.push('재시도 2회 이상');
  } else if (input.retryCount === 1) {
    score -= 20;
    reasons.push('재시도 1회');
  }

  // Latency penalty
  if (input.latency > 4000) {
    score -= 20;
    reasons.push('응답이 느림(4초 초과)');
  } else if (input.latency > 1500) {
    score -= 10;
    reasons.push('응답 지연(1.5초 초과)');
  }

  // In-app penalty
  if (input.isKakaoInApp) {
    score -= 10;
    reasons.push('인앱 브라우저 환경');
  }

  // Clamp to 0~100
  score = Math.max(0, Math.min(100, score));

  // 등급 결정
  let level: ConfidenceLevel = 'LOW';
  if (score >= 80) {
    level = 'HIGH';
  } else if (score >= 55) {
    level = 'MEDIUM';
  }

  return { level, score, reasons };
}

/**
 * 신뢰도 등급에 따른 사용자 친화적 텍스트를 반환합니다.
 */
export function getConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'HIGH':
      return '신뢰 높음';
    case 'MEDIUM':
      return '신뢰 보통';
    case 'LOW':
      return '신뢰 낮음';
    case 'UNAVAILABLE':
      return '분석 실패';
  }
}

/**
 * 신뢰도 등급에 따른 CSS 토큰 이름을 반환합니다.
 */
export function getConfidenceToken(level: ConfidenceLevel): string {
  switch (level) {
    case 'HIGH':
      return '--success';
    case 'MEDIUM':
      return '--warning';
    case 'LOW':
      return '--danger';
    case 'UNAVAILABLE':
      return '--muted';
  }
}

/**
 * AI 분석 로그 데이터로부터 신뢰도를 계산합니다.
 * (aiAnalysisLogger의 로그 구조와 호환)
 */
export function computeConfidenceFromLog(log: {
  result: {
    success: boolean;
    retryCount: number;
    latency: number;
  };
  env?: {
    isKakaoInApp?: boolean;
  };
}): ConfidenceResult {
  return computeConfidence({
    success: log.result.success,
    retryCount: log.result.retryCount,
    latency: log.result.latency,
    isKakaoInApp: log.env?.isKakaoInApp,
  });
}

