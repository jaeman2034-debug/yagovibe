import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./styles/layout.css";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { initSentry } from "@/lib/sentry";
import { initPush } from "./lib/pushNotifications";
// Firebase는 ./lib/firebase 로드로 초기화됨. Google: 기본 팝업 + AuthProvider getRedirectResult(호환).
import { authPersistenceReady } from "./lib/firebase";

// 구버전·PWA 등 불필요 SW만 제거. FCM 백그라운드용 `firebase-messaging-sw.js`는 유지.
if ("serviceWorker" in navigator) {
  const isFirebaseMessagingSw = (reg: ServiceWorkerRegistration) => {
    const urls = [reg.active?.scriptURL, reg.installing?.scriptURL, reg.waiting?.scriptURL].filter(
      Boolean
    ) as string[];
    return urls.some((u) => u.includes("firebase-messaging-sw.js"));
  };
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => {
      if (!isFirebaseMessagingSw(reg)) {
        void reg.unregister();
      }
    });
  });
}

// 🔥 모바일 WebView 저장소 접근 확인
console.log("🔍 [main.tsx] 브라우저 환경 확인:", {
  userAgent: navigator.userAgent,
  isWebView: /wv|WebView/i.test(navigator.userAgent),
  isIOSWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent),
  isAndroidWebView: /Android.*wv/i.test(navigator.userAgent),
  protocol: window.location.protocol,
  hostname: window.location.hostname,
  indexedDB: typeof indexedDB !== "undefined" ? "✅ 사용 가능" : "❌ 사용 불가",
  localStorage: typeof localStorage !== "undefined" ? "✅ 사용 가능" : "❌ 사용 불가",
  sessionStorage: typeof sessionStorage !== "undefined" ? "✅ 사용 가능" : "❌ 사용 불가",
  cookies: navigator.cookieEnabled ? "✅ 사용 가능" : "❌ 사용 불가"
});

// 🔥 쿠키 SameSite 설정 확인 (개발 환경에서만)
if (import.meta.env.DEV) {
  try {
    // 테스트 쿠키 설정 시도
    document.cookie = "test_cookie=test; SameSite=None; Secure";
    const hasCookie = document.cookie.includes("test_cookie");
    console.log("🍪 [main.tsx] 쿠키 테스트:", {
      cookieEnabled: navigator.cookieEnabled,
      testCookieSet: hasCookie,
      allCookies: document.cookie || "쿠키 없음"
    });
    // 테스트 쿠키 삭제
    document.cookie = "test_cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  } catch (err) {
    console.error("❌ [main.tsx] 쿠키 테스트 실패:", err);
  }
}

// 인증 상태 로그·구독은 AuthProvider(onAuthStateChanged)만 사용 — main에서 선행 구독 시 리다이렉트 복귀 직전 null 로그가 오탐.

// Capacitor 환경 감지
const isNative = (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) ?? false;

if (isNative) {
  import("@capacitor/splash-screen")
    .then(({ SplashScreen }) => {
      console.log("🔋 Native 모드, SplashScreen 적용");
      SplashScreen.hide();
    })
    .catch((err) => {
      console.warn("SplashScreen 로드 실패:", err);
    });
} else {
  console.log("💻 Web/PWA 모드 - SplashScreen 사용 안함");
}

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: any[]) => void;
    }
}

function initGA(): void {
    const GA_ID = import.meta.env.VITE_GA_ID;
    if (!GA_ID) {
        return;
    }

    if (!document.querySelector(`script[data-ga-id="${GA_ID}"]`)) {
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
        script.setAttribute("data-ga-id", GA_ID);
        document.head.appendChild(script);
    }

    window.dataLayer = window.dataLayer ?? [];
    window.gtag =
        window.gtag ??
        function gtag(...args: any[]) {
            window.dataLayer?.push(args);
        };

    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { transport_type: "beacon" });
}

// GA 초기화
initGA();

// Sentry 초기화
initSentry();

// 푸시 알림 초기화 (Capacitor 앱에서만)
if (isNative) {
  initPush();
}

function Root() {
    usePerformanceMonitor();
    return (
        <BrowserRouter>
            <App />
        </BrowserRouter>
    );
}

async function bootstrap() {
  // persistence / redirect는 AuthProvider에서 처리. 여기서 await 하면 setPersistence가
  // 일부 환경에서 끝나지 않을 때 #root가 비어 흰 화면만 보임.
  void authPersistenceReady.catch((e) => console.warn("[main] authPersistenceReady (백그라운드)", e));
  if (import.meta.env.DEV) {
    console.log("🔍 [main] bootstrap: React 마운트 우선 (auth 대기 없음)");
  }

  try {
    console.log("🚀 React 앱 시작 중...");

    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("❌ #root 엘리먼트를 찾을 수 없습니다!");
    }

    // Firestore listener race(b815) 완화: 개발환경 StrictMode 이중 마운트 비활성화
    ReactDOM.createRoot(rootElement).render(<Root />);

    console.log("✅ React 앱 마운트 완료");
  } catch (error) {
    console.error("❌❌❌ React 앱 마운트 실패:", error);
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>앱 로딩 실패</h1>
        <p>${error instanceof Error ? error.message : String(error)}</p>
        <p>콘솔을 확인하세요.</p>
      </div>
    `;
    }
  }
}

void bootstrap();
