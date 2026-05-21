import type { Sport } from "@/features/market/types";
import { sportsCategories } from "@/data/sportsCategories";
import { sportChipActiveClass, sportChipInactiveClass } from "@/constants/sportChipStyles";

type Props = {
  value: Sport | null;
  onSelect: (sport: Sport) => void;
  disabled?: boolean;
};

/**
 * 홈 허브와 동일한 종목 목록·이모지 — 상품 등록 등에서 단일 선택용
 */
export function MarketSportCategoryPicker({ value, onSelect, disabled }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <span>스포츠 선택</span>
        <span className="text-red-500" aria-hidden>
          *
        </span>
        <span className="text-xs font-normal text-gray-500">필수</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {sportsCategories.map((row) => {
          const selected = value === row.sportId;
          return (
            <button
              key={`${row.sportId}-${row.name}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(row.sportId)}
              title={row.name}
              className={`flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 text-center text-xs font-semibold transition sm:text-sm ${
                selected ? sportChipActiveClass : sportChipInactiveClass
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="text-lg sm:text-xl" aria-hidden>
                {row.icon}
              </span>
              <span className="line-clamp-2 leading-tight">{row.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
