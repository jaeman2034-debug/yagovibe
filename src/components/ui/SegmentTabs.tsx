import { cn } from "@/lib/utils";

export type SegmentTabItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

type SegmentTabsProps = {
  tabs: SegmentTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

/**
 * 하단 보더 + 활성 탭 강조 — 거래/경기/활동 등 상단 탭 통일용
 */
export function SegmentTabs({ tabs, activeId, onChange, className }: SegmentTabsProps) {
  return (
    <div
      className={cn(
        "flex w-full border-b border-gray-200 bg-white/95 dark:border-gray-700 dark:bg-gray-900/90",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={cn(
              "min-h-[44px] flex-1 py-2 text-center text-sm transition-colors",
              active
                ? "border-b-2 border-[#0a84ff] font-semibold text-gray-900 dark:text-gray-100"
                : "border-b-2 border-transparent font-medium text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
              tab.disabled && "cursor-not-allowed opacity-40"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
