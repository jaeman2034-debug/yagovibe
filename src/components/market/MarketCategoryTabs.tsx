/**
 * 🔥 마켓 카테고리 탭 컴포넌트
 * 
 * 카테고리 자동 분기 구조:
 * - 중앙화된 카테고리 설정 사용 (src/data/marketCategories.ts)
 * - 활성화된 카테고리만 자동 표시
 * - 새 카테고리 추가 시 설정 파일만 수정하면 자동 반영
 */

import { cn } from "@/lib/utils";
import type { MarketCategory } from "@/types/market";
import { SORTED_CATEGORIES } from "@/data/marketCategories";

interface MarketCategoryTabsProps {
  currentCategory: MarketCategory;
  onCategoryChange: (category: MarketCategory) => void;
}

export default function MarketCategoryTabs({
  currentCategory,
  onCategoryChange,
}: MarketCategoryTabsProps) {
  return (
    <div 
      className="sticky z-10 bg-white border-b border-gray-200"
      style={{
        top: `var(--header-h, 56px)`, // 🔥 헤더 높이 CSS 변수 사용
        boxShadow: '0 1px 0 rgba(0,0,0,0.06)', // 🔥 스크롤 시 구분선
      }}
    >
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
        {SORTED_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              currentCategory === category.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
            title={category.description} // 툴팁으로 설명 표시
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
