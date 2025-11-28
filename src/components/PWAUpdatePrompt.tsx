/**
 * PWA 업데이트 알림 컴포넌트
 * 
 * 새로운 버전이 감지되면 사용자에게 업데이트 알림을 표시합니다.
 */

import { useState, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";

interface PWAUpdatePromptProps {
  onUpdate: () => void;
  onDismiss?: () => void;
}

export function PWAUpdatePrompt({ onUpdate, onDismiss }: PWAUpdatePromptProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 🔥 Service Worker 완전 비활성화 (업로드 문제 해결)
    console.log("🔕 Service Worker 비활성화됨 (업로드 문제 해결)");
    return;
    
    /*
    // Service Worker 업데이트 감지
    if ("serviceWorker" in navigator) {
      // @ts-expect-error - virtual:pwa-register는 vite-plugin-pwa가 빌드 시 생성하는 가상 모듈
      import("virtual:pwa-register")
        .then(({ registerSW }) => {
          registerSW({
            onNeedRefresh() {
              setShow(true);
            },
            onOfflineReady() {
              console.log("✅ 오프라인에서도 사용할 준비 완료!");
            },
          });
        })
        .catch(() => {
          // 개발 모드에서는 무시
        });
    }
    */
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">새 버전이 있습니다</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            최신 기능과 개선사항을 사용하려면 업데이트하세요.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onUpdate();
                setShow(false);
              }}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              업데이트
            </button>
            {onDismiss && (
              <button
                onClick={() => {
                  onDismiss?.();
                  setShow(false);
                }}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                나중에
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

