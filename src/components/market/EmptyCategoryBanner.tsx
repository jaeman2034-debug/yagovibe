/**
 * 🔥 빈 카테고리 배너 컴포넌트
 * 게시글이 3개 이하일 때 표시되는 큰 CTA 배너
 */

import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import type { Sport, MarketCategory } from "@/types/market";

interface EmptyCategoryBannerProps {
  sport: Sport;
  category: MarketCategory;
  postCount: number;
  className?: string;
}

const CATEGORY_MESSAGES: Record<
  MarketCategory,
  { title: string; description: string; cta: string; icon: string }
> = {
  equipment: {
    title: "첫 상품을 올려주세요",
    description: "이 카테고리의 첫 판매자가 되어보세요!",
    cta: "상품 올리기",
    icon: "🛍️",
  },
  recruit: {
    title: "첫 팀 모집을 시작하세요",
    description: "함께할 팀원을 찾아보세요!",
    cta: "팀 모집하기",
    icon: "👥",
  },
  match: {
    title: "첫 매칭을 찾아보세요",
    description: "경기 상대를 찾아보세요!",
    cta: "매칭 찾기",
    icon: "⚽",
  },
  all: {
    title: "첫 글을 올려주세요",
    description: "이 종목의 첫 게시글을 작성해보세요!",
    cta: "글쓰기",
    icon: "✏️",
  },
  lesson: {
    title: "첫 레슨을 등록하세요",
    description: "레슨을 등록해보세요!",
    cta: "레슨 등록",
    icon: "📚",
  },
  ground: {
    title: "첫 구장을 양도하세요",
    description: "구장을 양도해보세요!",
    cta: "구장 양도",
    icon: "🏟️",
  },
  ticket: {
    title: "첫 티켓을 판매하세요",
    description: "티켓을 판매해보세요!",
    cta: "티켓 판매",
    icon: "🎫",
  },
};

export default function EmptyCategoryBanner({
  sport,
  category,
  postCount,
  className = "",
}: EmptyCategoryBannerProps) {
  const navigate = useNavigate();

  // 3개 초과면 표시 안 함
  if (postCount > 3) {
    return null;
  }

  const message = CATEGORY_MESSAGES[category] || CATEGORY_MESSAGES.all;

  const handleClick = () => {
    // 이벤트 트래킹
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "empty_category_banner_click", {
        sport,
        category,
        postCount,
        label: message.cta,
      });
    }

    // 해당 카테고리로 글쓰기 페이지 이동
    if (category === "all") {
      navigate(`/sports/${sport}/market/write`);
    } else {
      navigate(`/sports/${sport}/market/write?category=${category}`);
    }
  };

  return (
    <div
      className={`mx-4 my-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-lg ${className}`}
    >
      <div className="p-6 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">{message.icon}</span>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          {message.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">{message.description}</p>
        <button
          onClick={handleClick}
          className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          {message.cta}
        </button>
      </div>
    </div>
  );
}
