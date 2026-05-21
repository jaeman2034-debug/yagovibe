/**
 * 🔥 마켓 카테고리 탭 컴포넌트
 * 
 * 카테고리 자동 분기 구조:
 * - 중앙화된 카테고리 설정 사용 (src/data/marketCategories.ts)
 * - 활성화된 카테고리만 자동 표시
 */

import { cn } from "@/lib/utils";
import type { MarketCategory } from "../types";
import { SORTED_CATEGORIES } from "@/data/marketCategories";

interface MarketTabsProps {
  active: MarketCategory;
  onCategoryChange: (category: MarketCategory) => void;
}

export default function MarketTabs({ active, onCategoryChange }: MarketTabsProps) {
  const handleClick = (categoryId: MarketCategory, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🔥 [MarketTabs] 탭 클릭:", categoryId);
    
    try {
      onCategoryChange(categoryId);
      console.log("✅ [MarketTabs] 탭 변경 성공:", categoryId);
    } catch (error) {
      console.error("❌ [MarketTabs] 탭 변경 실패:", error);
    }
  };

  return (
    <div 
      className="sticky z-20 bg-white border-b border-gray-200"
      style={{
        top: `var(--header-h, 56px)`, // 🔥 헤더 높이 CSS 변수 사용
        boxShadow: '0 1px 0 rgba(0,0,0,0.06)', // 🔥 스크롤 시 구분선
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
        {SORTED_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={(e) => handleClick(category.id, e)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors relative z-30",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              active === category.id
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
            )}
            title={category.description}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
