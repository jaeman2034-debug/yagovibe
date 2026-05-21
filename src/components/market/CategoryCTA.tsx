/**
 * 🔥 카테고리별 글쓰기 CTA 컴포넌트
 * 카테고리 탭 아래에 표시되는 컨텍스트 CTA 버튼
 */

import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import type { Sport, MarketCategory } from "@/types/market";

interface CategoryCTAProps {
  sport: Sport;
  category: MarketCategory;
  className?: string;
}

const CATEGORY_CTA_CONFIG: Record<
  MarketCategory,
  { label: string; icon: string; description: string }
> = {
  equipment: {
    label: "상품 올리기",
    icon: "🛍️",
    description: "중고 장비를 판매해보세요",
  },
  recruit: {
    label: "팀 모집하기",
    icon: "👥",
    description: "함께할 팀원을 모집하세요",
  },
  match: {
    label: "매칭 찾기",
    icon: "⚽",
    description: "경기 상대를 찾아보세요",
  },
  all: {
    label: "글쓰기",
    icon: "✏️",
    description: "새 글을 작성하세요",
  },
  lesson: {
    label: "레슨 등록",
    icon: "📚",
    description: "레슨을 등록하세요",
  },
  ground: {
    label: "구장 양도",
    icon: "🏟️",
    description: "구장을 양도하세요",
  },
  ticket: {
    label: "티켓 판매",
    icon: "🎫",
    description: "티켓을 판매하세요",
  },
};

export default function CategoryCTA({
  sport,
  category,
  className = "",
}: CategoryCTAProps) {
  const navigate = useNavigate();

  // "all" 카테고리는 CTA 표시 안 함 (FAB만 사용)
  if (category === "all") {
    return null;
  }

  const config = CATEGORY_CTA_CONFIG[category];
  if (!config) {
    return null;
  }

  const handleClick = () => {
    // 이벤트 트래킹
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "category_cta_click", {
        sport,
        category,
        label: config.label,
      });
    }

    // 해당 카테고리로 글쓰기 페이지 이동
    navigate(`/sports/${sport}/market/write?category=${category}`);
  };

  return (
    <div className={`px-4 py-3 bg-blue-50 border-b border-blue-100 ${className}`}>
      <button
        onClick={handleClick}
        className="w-full flex items-center justify-between p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div className="text-left">
            <div className="font-semibold text-sm">{config.label}</div>
            <div className="text-xs text-blue-100">{config.description}</div>
          </div>
        </div>
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
