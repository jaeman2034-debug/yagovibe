/**
 * 🔥 마켓 글쓰기 FAB (스포츠 허브용)
 * 1차 선택 모달 후 `/trade/create` 등으로 이동 (작성 폼 직행 금지)
 */

import { useState } from "react";
import { Plus } from "lucide-react";
import { createPortal } from "react-dom";
import PostTypeSelectModal from "@/components/market/PostTypeSelectModal";
import type { Sport, MarketView, MarketCategory } from "../types";

interface MarketFABProps {
  contextSport: Sport;
  view?: MarketView;
  category?: MarketCategory;
}

export default function MarketFAB({
  contextSport,
  view = "sport",
  category = "all",
}: MarketFABProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (typeof window !== "undefined" && (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "market_post_create_start", {
        contextSport,
        view,
        category,
      });
    }
    setIsModalOpen(true);
  };

  const fabContent = (
    <button
      type="button"
      onClick={handleClick}
      className="fixed z-[11000] right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
      style={{
        bottom: "calc(64px + 16px + env(safe-area-inset-bottom, 0px))",
        position: "fixed",
        right: "max(1.5rem, calc((100vw - 420px) / 2 + 1.5rem))",
        zIndex: 11000,
        contain: "layout style paint",
        isolation: "isolate",
        transform: "none",
        WebkitTransform: "none",
      }}
      aria-label="글쓰기"
    >
      <Plus className="w-6 h-6" />
    </button>
  );

  return (
    <>
      {typeof window !== "undefined" ? createPortal(fabContent, document.body) : fabContent}
      <PostTypeSelectModal
        sport={contextSport}
        currentCategory={category === "all" ? undefined : category}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
