// src/utils/deviceDetection.ts
// 🔥 Phase 3-2: 모바일 디바이스 감지 (3중 가드용)

/**
 * 모바일 디바이스 감지 (엄격한 조건)
 * 데스크톱에서 음성이 절대 실행되지 않도록 보장
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  
  const ua = navigator.userAgent || navigator.vendor || "";
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  // 추가 체크: 터치 스크린 지원 여부
  const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  
  // 화면 크기 체크 (보조 조건)
  const isSmallScreen = window.innerWidth <= 768;
  
  // 🔥 3중 조건: UserAgent + Touch + Screen Size
  return isMobile && hasTouchScreen && isSmallScreen;
}

