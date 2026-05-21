import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { MarketSortMode } from "@/types/sort";
import type { User } from "firebase/auth";
import type { LatLng } from "@/utils/geo";

interface MarketTopBarProps {
  sortMode: MarketSortMode;
  onSortModeChange: (mode: MarketSortMode) => void;
  sortMenuOpen: boolean;
  onSortMenuOpenChange: (open: boolean) => void;
  user: User | null;
  userLoc: LatLng | null;
}

/**
 * 🔥 Market 전용 상단 바
 * 
 * ✅ 역할:
 * - 뒤로가기 버튼 (←)
 * - 더보기 메뉴 (⋮) - 정렬 옵션
 * 
 * ✅ 특징:
 * - 항상 렌더링 (조건부 렌더링 없음)
 * - sticky 고정 (스크롤 시 상단 유지)
 * - 공통 Header와 독립적
 */
export default function MarketTopBar({
  sortMode,
  onSortModeChange,
  sortMenuOpen,
  onSortMenuOpenChange,
  user,
  userLoc,
}: MarketTopBarProps) {
  const navigate = useNavigate();

  return (
    <div 
      className="flex items-center justify-between px-2 py-2 bg-white border-b border-gray-200"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* ✅ 뒤로가기 버튼 */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="뒤로가기"
        className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-700 hover:text-gray-900"
        style={{
          fontSize: "22px",
          lineHeight: 1,
        }}
      >
        ←
      </button>

      {/* ✅ 더보기 메뉴 (정렬 옵션) */}
      <DropdownMenu open={sortMenuOpen} onOpenChange={onSortMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="더보기"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600 hover:text-gray-900"
            style={{
              fontSize: "22px",
              lineHeight: 1,
            }}
          >
            ⋮
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-b">
            정렬
          </div>
          <DropdownMenuItem
            onClick={() => {
              onSortModeChange("latest");
              onSortMenuOpenChange(false);
            }}
            className={sortMode === "latest" ? "bg-blue-50 text-blue-700 font-medium" : ""}
          >
            <span className="mr-2">{sortMode === "latest" ? "✓" : "○"}</span>
            최근 등록
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (userLoc) {
                onSortModeChange("nearest");
                onSortMenuOpenChange(false);
              }
            }}
            disabled={!userLoc}
            className={sortMode === "nearest" ? "bg-emerald-50 text-emerald-700 font-medium" : ""}
          >
            <span className="mr-2">{sortMode === "nearest" ? "✓" : "○"}</span>
            내 주변
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onSortModeChange("smart");
              onSortMenuOpenChange(false);
            }}
            className={sortMode === "smart" ? "bg-purple-50 text-purple-700 font-medium" : ""}
          >
            <span className="mr-2">{sortMode === "smart" ? "✓" : "○"}</span>
            운동인 추천
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onSortModeChange("recommended");
              onSortMenuOpenChange(false);
            }}
            disabled={!user}
            className={sortMode === "recommended" ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium" : ""}
          >
            <span className="mr-2">{sortMode === "recommended" ? "✓" : "○"}</span>
            AI 코치 추천
          </DropdownMenuItem>
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 border-b mt-1">
            기타
          </div>
          <DropdownMenuItem
            onClick={() => {
              // TODO: 필터 기능
              onSortMenuOpenChange(false);
            }}
          >
            🔍 필터
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              // TODO: 신고/도움말
              onSortMenuOpenChange(false);
            }}
          >
            📞 도움말
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

