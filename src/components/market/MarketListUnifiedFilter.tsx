/**
 * `/sports/:sport/market` (MarketList) — 종목·유형·정렬을 ⋮ 패널로 통합
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sportsCategories } from "@/data/sportsCategories";
import type { MarketListCategoryFilter, MarketListSort } from "@/services/marketService";

const MD_UP_QUERY = "(min-width: 768px)";

function useMediaMdUp(): boolean {
  const [mdUp, setMdUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MD_UP_QUERY);
    setMdUp(mq.matches);
    const onChange = () => setMdUp(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mdUp;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

function scrollTopSmooth() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const FILTER_SHEET_Z = "z-[100052]";
const triggerBtnClass =
  "shrink-0 inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100";

const CATEGORY_OPTIONS: { value: MarketListCategoryFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "equipment", label: "중고" },
  { value: "recruit", label: "모집" },
  { value: "match", label: "매칭" },
];

const SORT_OPTIONS: { value: MarketListSort; label: string }[] = [
  { value: "latest", label: "최신" },
  { value: "price_low", label: "가격 낮은순" },
  { value: "price_high", label: "가격 높은순" },
  { value: "views", label: "조회순" },
];

function categoryLabel(v: MarketListCategoryFilter): string {
  return CATEGORY_OPTIONS.find((c) => c.value === v)?.label ?? v;
}

function sortLabel(v: MarketListSort): string {
  return SORT_OPTIONS.find((s) => s.value === v)?.label ?? v;
}

export type MarketListUnifiedFilterProps = {
  sport: string;
  onSportChange: (sportId: string) => void;
  category: MarketListCategoryFilter;
  onCategoryChange: (c: MarketListCategoryFilter) => void;
  sort: MarketListSort;
  onSortChange: (s: MarketListSort) => void;
};

export default function MarketListUnifiedFilter({
  sport,
  onSportChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
}: MarketListUnifiedFilterProps) {
  const mdUp = useMediaMdUp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetPanelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const panelOpen = !mdUp && sheetOpen;
  useBodyScrollLock(panelOpen);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    if (mdUp) setSheetOpen(false);
  }, [mdUp]);

  useEffect(() => {
    if (!sheetOpen || mdUp) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSheetOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen, mdUp]);

  const sportRow = sportsCategories.find((r) => r.sportId === sport);
  const sportSummary = sportRow ? `${sportRow.icon} ${sportRow.name}` : sport;

  const sectionTitle = "px-3 py-2 text-[11px] font-semibold text-gray-500";
  const rowActive = "font-semibold text-blue-600";
  const rowBase =
    "flex min-h-[48px] w-full items-center justify-between px-4 text-left text-base text-gray-900 active:bg-gray-100";

  const pickSport = (id: string) => {
    onSportChange(id);
    closeSheet();
    scrollTopSmooth();
  };
  const pickCat = (c: MarketListCategoryFilter) => {
    onCategoryChange(c);
    closeSheet();
    scrollTopSmooth();
  };
  const pickSort = (s: MarketListSort) => {
    onSortChange(s);
    closeSheet();
    scrollTopSmooth();
  };

  const sheetBody = (
    <>
      <div className={sectionTitle}>종목</div>
      <div className="max-h-[40vh] overflow-y-auto">
        {sportsCategories.map((row) => {
          const active = sport === row.sportId;
          return (
            <button
              key={`${row.sportId}-${row.name}`}
              type="button"
              className={`${rowBase} ${active ? rowActive : ""}`}
              onClick={() => pickSport(row.sportId)}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>{row.icon}</span>
                {row.name}
              </span>
              {active ? <span aria-hidden>✓</span> : null}
            </button>
          );
        })}
      </div>
      <div className="my-1 border-t border-gray-100" role="presentation" />
      <div className={sectionTitle}>유형</div>
      {CATEGORY_OPTIONS.map((opt) => {
        const active = category === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`${rowBase} ${active ? rowActive : ""}`}
            onClick={() => pickCat(opt.value)}
          >
            <span>{opt.label}</span>
            {active ? <span aria-hidden>✓</span> : null}
          </button>
        );
      })}
      <div className="my-1 border-t border-gray-100" role="presentation" />
      <div className={sectionTitle}>정렬</div>
      {SORT_OPTIONS.map((opt) => {
        const active = sort === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`${rowBase} ${active ? rowActive : ""}`}
            onClick={() => pickSort(opt.value)}
          >
            <span>{opt.label}</span>
            {active ? <span aria-hidden>✓</span> : null}
          </button>
        );
      })}
    </>
  );

  const desktopSection = (title: string) => (
    <div className="pointer-events-none px-2 py-1.5 text-xs font-semibold text-gray-500">{title}</div>
  );
  const desktopRow = "min-h-[44px] flex items-center justify-between";

  return (
    <div className="w-full">
      <div className="flex min-w-0 items-center gap-2 py-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span
            className="max-w-[42%] truncate rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-900 ring-1 ring-violet-100 sm:max-w-[200px]"
            title={sportSummary}
          >
            {sportSummary}
          </span>
          <span
            className="max-w-[28%] truncate rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-100"
            title={categoryLabel(category)}
          >
            {categoryLabel(category)}
          </span>
          <span
            className="max-w-[28%] truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200/80"
            title={sortLabel(sort)}
          >
            {sortLabel(sort)}
          </span>
        </div>
        {mdUp ? (
          <DropdownMenu portal>
            <DropdownMenuTrigger asChild>
              <button ref={triggerRef} type="button" className={triggerBtnClass} aria-label="종목·유형·정렬 필터">
                <MoreVertical className="h-5 w-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-[min(80dvh,720px)] overflow-y-auto">
              {desktopSection("종목")}
              {sportsCategories.map((row) => (
                <DropdownMenuItem
                  key={`${row.sportId}-${row.name}`}
                  className={desktopRow}
                  onClick={() => {
                    onSportChange(row.sportId);
                    scrollTopSmooth();
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden>{row.icon}</span>
                    {row.name}
                  </span>
                  {sport === row.sportId ? <span className="text-blue-600">✓</span> : null}
                </DropdownMenuItem>
              ))}
              <div className="my-1 border-t border-gray-100" role="presentation" />
              {desktopSection("유형")}
              {CATEGORY_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  className={desktopRow}
                  onClick={() => {
                    onCategoryChange(opt.value);
                    scrollTopSmooth();
                  }}
                >
                  <span>{opt.label}</span>
                  {category === opt.value ? <span className="text-blue-600">✓</span> : null}
                </DropdownMenuItem>
              ))}
              <div className="my-1 border-t border-gray-100" role="presentation" />
              {desktopSection("정렬")}
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  className={desktopRow}
                  onClick={() => {
                    onSortChange(opt.value);
                    scrollTopSmooth();
                  }}
                >
                  <span>{opt.label}</span>
                  {sort === opt.value ? <span className="text-blue-600">✓</span> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <button
              ref={triggerRef}
              type="button"
              className={triggerBtnClass}
              aria-label="종목·유형·정렬 필터"
              onClick={(e) => {
                e.stopPropagation();
                setSheetOpen(true);
              }}
            >
              <MoreVertical className="h-5 w-5" aria-hidden />
            </button>
            {sheetOpen && typeof document !== "undefined"
              ? createPortal(
                  <div className={`fixed inset-0 ${FILTER_SHEET_Z}`} role="dialog" aria-modal="true" aria-label="필터">
                    <button
                      type="button"
                      className="absolute inset-0 cursor-default border-0 bg-black/40"
                      aria-label="닫기"
                      onClick={closeSheet}
                    />
                    <div
                      ref={sheetPanelRef}
                      className="absolute bottom-0 left-0 right-0 max-h-[88dvh] overflow-hidden rounded-t-2xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
                    >
                      <div className="flex justify-center pb-1 pt-2">
                        <span className="h-1 w-10 rounded-full bg-gray-300" />
                      </div>
                      <div className="border-b border-gray-100 px-4 pb-3 pt-1">
                        <p className="text-center text-sm font-semibold text-gray-900">필터</p>
                        <p className="mt-0.5 text-center text-xs text-gray-500">종목 · 유형 · 정렬</p>
                      </div>
                      <div className="max-h-[calc(88dvh-8rem)] overflow-y-auto pb-1">{sheetBody}</div>
                      <button
                        type="button"
                        className="mt-1 flex min-h-[48px] w-full items-center justify-center border-t border-gray-100 px-4 text-base text-gray-500"
                        onClick={closeSheet}
                      >
                        닫기
                      </button>
                    </div>
                  </div>,
                  document.body
                )
              : null}
          </>
        )}
      </div>
    </div>
  );
}
