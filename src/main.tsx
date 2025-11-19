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

// PWA Service Worker 등록
initPWA();

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

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>
);
