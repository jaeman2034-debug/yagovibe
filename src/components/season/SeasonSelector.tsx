/**
 * 🔥 SeasonSelector - 시즌 선택 컴포넌트 (STEP: 시즌/연도 관리 시스템)
 * 
 * 사용 위치:
 * - 개인 커리어 페이지
 * - 랭킹 페이지
 * 
 * 규칙:
 * - 시즌 선택은 필터일 뿐, 상태 아님
 * - "전체" 옵션 포함
 */

import { useSeasons } from "@/hooks/useSeasons";
import { useActiveSeason } from "@/hooks/useActiveSeason";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface SeasonSelectorProps {
  selectedSeasonId?: string | null;
  onSeasonChange?: (seasonId: string | null) => void;
  showAll?: boolean; // "전체" 옵션 표시 여부
}

export function SeasonSelector({
  selectedSeasonId,
  onSeasonChange,
  showAll = true,
}: SeasonSelectorProps) {
  const { seasons, loading } = useSeasons({ enabled: true });
  const { activeSeason } = useActiveSeason();

  if (loading) {
    return (
      <div className="px-4 py-2">
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    );
  }

  // 기본값: 활성 시즌 또는 null
  const currentSeasonId = selectedSeasonId ?? activeSeason?.id ?? null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">시즌:</span>
      </div>
      <div className="flex gap-1">
        {showAll && (
          <Button
            variant={currentSeasonId === null ? "default" : "outline"}
            size="sm"
            onClick={() => onSeasonChange?.(null)}
            className="text-xs"
          >
            전체
          </Button>
        )}
        {seasons.map((season) => (
          <Button
            key={season.id}
            variant={currentSeasonId === season.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSeasonChange?.(season.id)}
            className="text-xs"
          >
            {season.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
