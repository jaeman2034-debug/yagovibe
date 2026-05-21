/**
 * 🔥 Phase 22: 네비게이션 의도 감지
 * 
 * 사용자가 "가겠다"는 의도를 표현했는지 감지
 */

// 🔥 Phase 22: 네비게이션 의도 트리거 문장
const NAVIGATION_TRIGGERS = [
  '여기로 갈게',
  '여기 갈래',
  '이쪽으로 가자',
  '안내해줘',
  '여기 가고 싶어',
  '여기로 가',
  '이곳으로 가',
  '가자',
  '갈게',
  '갈래',
  '안내',
  '길 안내',
  '경로',
  '여기로',
  '이쪽으로',
];

/**
 * STT 결과에서 네비게이션 의도 감지
 */
export function detectNavigationIntent(text: string): boolean {
  const normalizedText = text.trim().toLowerCase();
  
  return NAVIGATION_TRIGGERS.some(trigger => 
    normalizedText.includes(trigger.toLowerCase())
  );
}
