/**
 * PWA Service Worker 등록 및 업데이트 관리
 * 
 * 새 버전이 감지되면 사용자에게 알림을 표시합니다.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - virtual:pwa-register는 vite-plugin-pwa가 빌드 시 생성하는 가상 모듈
import { registerSW } from "virtual:pwa-register";

export function initPWA() {
  if (!("serviceWorker" in navigator)) {
    console.log("서비스워커 미지원 환경");
    return;
  }

  const updateSW = registerSW({
    onNeedRefresh() {
      // 여기서 토스트/다이얼로그 띄울 수 있음
      console.log("🔄 새로운 버전이 있습니다. 새로고침하면 업데이트 됩니다.");
      if (confirm("YAGO VIBE 새 버전이 있습니다. 지금 새로고침할까요?")) {
        updateSW();
      }
    },
    onOfflineReady() {
      console.log("✅ 오프라인에서도 사용할 준비 완료!");
    },
  });
}

