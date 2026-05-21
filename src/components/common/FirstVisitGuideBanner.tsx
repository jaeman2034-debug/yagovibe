/**
 * 첫 접속 가이드 배너 (비차단형)
 * 
 * Sprint 8: 공식 시스템화 & 첫 접속 UX
 * 
 * 원칙:
 * - 모달 ❌
 * - 팝업 ❌
 * - 상단 얇은 가이드 배너 ⭕
 * - 닫기 가능 / 재등장 안 함
 */

import { useState, useEffect } from "react";

export function FirstVisitGuideBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 첫 방문 체크 (localStorage)
    const hasVisited = localStorage.getItem("firstVisitCompleted");
    if (!hasVisited) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("firstVisitCompleted", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="container mx-auto max-w-7xl flex items-center justify-between">
        <p className="text-sm text-blue-700">
          공지 · 대회 · 대관 정보는 본 페이지 기준으로 안내됩니다.
        </p>
        <button
          onClick={handleClose}
          className="text-blue-700 hover:text-blue-900 text-sm font-medium ml-4"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

