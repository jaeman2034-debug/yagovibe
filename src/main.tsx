import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./styles/layout.css";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { initSentry } from "@/lib/sentry";
import { initPWA } from "./pwa-sw-register";
import { initPush } from "./lib/pushNotifications";
// 🔥 Firebase 초기화 및 익명 로그인 보장 (업로드 문제 해결)
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { app, auth } from "./lib/firebase";

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

// 🔥 실명 로그인 우선 정책: 자동 익명 로그인 제거
// 사용자가 명시적으로 "게스트로 둘러보기"를 선택할 때만 익명 로그인
console.log("🚀 [main.tsx] Firebase Auth 리스너 등록 (자동 익명 로그인 비활성화)");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ [main.tsx] 로그인 상태:", {
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      email: user.email || "없음",
      displayName: user.displayName || "없음",
      providerId: user.providerId
    });
  } else {
    console.log("ℹ️ [main.tsx] 로그인되지 않음 - 사용자가 직접 로그인하거나 게스트 모드를 선택할 수 있습니다.");
    console.log("📋 로그인 방법:");
    console.log("  1. /login 페이지에서 이메일/비밀번호 로그인");
    console.log("  2. /start 페이지에서 '게스트로 둘러보기' 선택");
  }
});

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

// 🚫 Service Worker 제거됨 (개발 모드에서는 사용 안 함)

// GA 초기화
initGA();

// Sentry 초기화
initSentry();

// 🔥 Service Worker 강제 비활성화 (업로드 문제 해결)
// initPWA();

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

// 🔥 에러 캐치를 위한 try-catch 추가
try {
  console.log("🚀 React 앱 시작 중...");
  
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("❌ #root 엘리먼트를 찾을 수 없습니다!");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
  
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
