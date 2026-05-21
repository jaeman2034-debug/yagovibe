/**
 * 🔥 마켓 글쓰기 FAB 컴포넌트
 * Portal로 렌더링하여 scroll container 밖에서 fixed position 정상 동작
 * 클릭 시 글쓰기 타입 선택 모달 표시
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { createPortal } from "react-dom";
import PostTypeSelectModal from "./PostTypeSelectModal";
import type { Sport, MarketCategory } from "@/types/market";

interface MarketFABProps {
  contextSport: Sport;
  view?: "sport" | "all";
  category?: string;
}

export default function MarketFAB({
  contextSport,
  view = "sport",
  category = "all",
}: MarketFABProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    // 이벤트 트래킹
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "market_post_create_start", {
        contextSport,
        view,
        category,
      });
    }

    // 모달 열기
    setIsModalOpen(true);
  };

  const fabContent = (
    <button
      onClick={handleClick}
      className="fixed w-14 h-14 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center shadow-lg"
      style={{
        position: "fixed",
        bottom: "90px", // 🔥 하단 네비 위 위치
        right: "max(20px, calc((100vw - 420px) / 2 + 20px))", // 🔥 모바일 프레임 내부 우측 하단 고정
        zIndex: 999999, // 🔥 최상위 z-index
        // 🔥 항상 표시 보장
        display: "flex",
        visibility: "visible",
        opacity: 1,
        // 🔥 부모의 transform/perspective/filter 영향 완전 차단
        contain: "layout style paint",
        isolation: "isolate",
        // 🔥 transform 명시적 제거
        transform: "none",
        WebkitTransform: "none",
      }}
      aria-label="글쓰기"
    >
      <Plus className="w-6 h-6" />
    </button>
  );

  // 🔥 Portal로 body에 직접 렌더링 (scroll container 밖에서 fixed position 정상 동작)
  return (
    <>
      {typeof window !== "undefined" 
        ? createPortal(fabContent, document.body)
        : fabContent
      }
      
      <PostTypeSelectModal
        sport={contextSport}
        currentCategory={category as MarketCategory}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
