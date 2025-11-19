/**
 * 오프라인 상태 표시 컴포넌트
 * 
 * 네트워크 연결 상태를 실시간으로 표시합니다.
 */

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShow(true);
      setTimeout(() => setShow(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShow(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all animate-in slide-in-from-top-4 ${
        isOnline
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>인터넷 연결이 복구되었습니다</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>오프라인 모드입니다</span>
        </>
      )}
    </div>
  );
}
