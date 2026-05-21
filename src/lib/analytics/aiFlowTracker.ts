/**
 * 🔥 B단계: AI 분석 인앱 → 외부 브라우저 전환 추적
 * 
 * flowId는 "인앱 실패 → CTA 클릭 → 외부 전환 → 재시도"를 묶는 유일한 키
 */

const FLOW_KEY = 'ai_flow_id';

/**
 * flowId 생성 (단일 진실 소스)
 * 
 * 인앱 브라우저에서 AI 분석 실패 후 CTA 클릭 시 호출
 */
export const createFlowId = (): string => {
  // UUID v4 생성 (crypto.randomUUID 사용, 없으면 fallback)
  let flowId: string;
  
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    flowId = crypto.randomUUID();
  } else {
    // Fallback: 타임스탬프 + 랜덤 문자열
    flowId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  localStorage.setItem(FLOW_KEY, flowId);
  console.log('✅ [aiFlowTracker] flowId 생성:', flowId);
  return flowId;
};

/**
 * flowId 조회
 * 
 * 외부 브라우저 전환 후 또는 AI 분석 재시도 시 호출
 */
export const getFlowId = (): string | null => {
  // 1순위: URL 쿼리 파라미터 (외부 브라우저 전환 시)
  const params = new URLSearchParams(window.location.search);
  const flowIdFromQuery = params.get('flowId');
  
  if (flowIdFromQuery) {
    // localStorage에도 저장 (이중 안전)
    localStorage.setItem(FLOW_KEY, flowIdFromQuery);
    console.log('✅ [aiFlowTracker] flowId URL에서 복원:', flowIdFromQuery);
    return flowIdFromQuery;
  }
  
  // 2순위: localStorage
  const flowId = localStorage.getItem(FLOW_KEY);
  if (flowId) {
    console.log('✅ [aiFlowTracker] flowId localStorage에서 조회:', flowId);
    return flowId;
  }
  
  return null;
};

/**
 * flowId 정리
 * 
 * 전환 완료 또는 분석 성공 시 호출
 */
export const clearFlowId = (): void => {
  localStorage.removeItem(FLOW_KEY);
  console.log('✅ [aiFlowTracker] flowId 정리 완료');
  
  // URL에서도 제거 (선택사항)
  const params = new URLSearchParams(window.location.search);
  if (params.has('flowId')) {
    params.delete('flowId');
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }
};

