/**
 * PWA 설치 프롬프트 컴포넌트
 * 
 * 사용자에게 PWA 설치를 안내하고 설치 버튼을 제공합니다.
 */

import { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 이미 설치되어 있는지 확인
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // 로컬 스토리지에서 이전에 닫았는지 확인
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        setShow(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 설치 완료 감지
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShow(false);
      localStorage.removeItem("pwa-install-dismissed");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShow(false);
      setDeferredPrompt(null);
      localStorage.removeItem("pwa-install-dismissed");
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-install-dismissed", "true");
    // 7일 후 다시 표시
    setTimeout(() => {
      localStorage.removeItem("pwa-install-dismissed");
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (isInstalled || !show || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">YAGO VIBE를 설치하세요</h3>
            <p className="text-xs text-indigo-100 mb-3">
              홈 화면에 추가하여 더 빠르고 편리하게 사용하세요.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-white text-indigo-600 text-xs font-medium rounded-md hover:bg-indigo-50 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                설치하기
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-indigo-500/20 text-white text-xs rounded-md hover:bg-indigo-500/30 transition-colors"
              >
                나중에
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-indigo-100 hover:text-white transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

