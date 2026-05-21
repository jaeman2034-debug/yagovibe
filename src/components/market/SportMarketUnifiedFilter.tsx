/**
 * 스포츠 허브 마켓 — 유형(카테고리)·정렬을 ⋮ 패널로 통합 (모바일 시트 / 데스크톱 포털 드롭다운)
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
import type { MarketCategory } from "@/types/market";
import { SORTED_CATEGORIES } from "@/data/marketCategories";

export type SportMarketSortMode = "latest" | "nearest";

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

function categoryLabel(id: MarketCategory): string {
  return SORTED_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

function sortLabel(s: SportMarketSortMode): string {
  return s === "nearest" ? "가까운순" : "최신순";
}

type SportMarketUnifiedFilterProps = {
  /** 상단 왼쪽 제목 (예: 축구 마켓) */
  sportTitle: string;
  currentCategory: MarketCategory;
  onCategoryChange: (c: MarketCategory) => void;
  sort: SportMarketSortMode;
  onSortChange: (s: SportMarketSortMode) => void;
};

export default function SportMarketUnifiedFilter({
  sportTitle,
  currentCategory,
  onCategoryChange,
  sort,
  onSortChange,
}: SportMarketUnifiedFilterProps) {
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

  const sectionTitle = "px-3 py-2 text-[11px] font-semibold text-gray-500";
  const rowActive = "font-semibold text-blue-600";
  const rowBase =
    "flex min-h-[48px] w-full items-center justify-between px-4 text-left text-base text-gray-900 active:bg-gray-100";

  const handleCategory = (c: MarketCategory) => {
    onCategoryChange(c);
    closeSheet();
    scrollTopSmooth();
  };

  const handleSort = (s: SportMarketSortMode) => {
    onSortChange(s);
    closeSheet();
    scrollTopSmooth();
  };

  const filterBody = (
    <>
      <div className={sectionTitle}>유형</div>
      {SORTED_CATEGORIES.map((cat) => {
        const active = currentCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            className={`${rowBase} ${active ? rowActive : ""}`}
            onClick={() => handleCategory(cat.id)}
          >
            <span>{cat.label}</span>
            {active ? <span aria-hidden>✓</span> : null}
          </button>
        );
      })}
      <div className="my-1 border-t border-gray-100" role="presentation" />
      <div className={sectionTitle}>정렬</div>
      <button
        type="button"
        className={`${rowBase} ${sort === "latest" ? rowActive : ""}`}
        onClick={() => handleSort("latest")}
      >
        <span>최신순</span>
        {sort === "latest" ? <span aria-hidden>✓</span> : null}
      </button>
      <button
        type="button"
        className={`${rowBase} ${sort === "nearest" ? rowActive : ""}`}
        onClick={() => handleSort("nearest")}
      >
        <span>가까운순</span>
        {sort === "nearest" ? <span aria-hidden>✓</span> : null}
      </button>
    </>
  );

  const desktopSection = (title: string) => (
    <div className="pointer-events-none px-2 py-1.5 text-xs font-semibold text-gray-500">{title}</div>
  );
  const desktopRow = "min-h-[44px] flex items-center justify-between";

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-2 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-semibold text-gray-900 sm:text-base">{sportTitle}</span>
          <span
            className="max-w-[140px] truncate rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-100"
            title={categoryLabel(currentCategory)}
          >
            {categoryLabel(currentCategory)}
          </span>
          <span
            className="max-w-[100px] truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200/80"
            title={sortLabel(sort)}
          >
            {sortLabel(sort)}
          </span>
        </div>
        {mdUp ? (
          <DropdownMenu portal>
            <DropdownMenuTrigger asChild>
              <button ref={triggerRef} type="button" className={triggerBtnClass} aria-label="유형·정렬 필터">
                <MoreVertical className="h-5 w-5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {desktopSection("유형")}
              {SORTED_CATEGORIES.map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  className={desktopRow}
                  onClick={() => {
                    onCategoryChange(cat.id);
                    scrollTopSmooth();
                  }}
                >
                  <span>{cat.label}</span>
                  {currentCategory === cat.id ? <span className="text-blue-600">✓</span> : null}
                </DropdownMenuItem>
              ))}
              <div className="my-1 border-t border-gray-100" role="presentation" />
              {desktopSection("정렬")}
              <DropdownMenuItem
                className={desktopRow}
                onClick={() => {
                  onSortChange("latest");
                  scrollTopSmooth();
                }}
              >
                <span>최신순</span>
                {sort === "latest" ? <span className="text-blue-600">✓</span> : null}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={desktopRow}
                onClick={() => {
                  onSortChange("nearest");
                  scrollTopSmooth();
                }}
              >
                <span>가까운순</span>
                {sort === "nearest" ? <span className="text-blue-600">✓</span> : null}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <button
              ref={triggerRef}
              type="button"
              className={triggerBtnClass}
              aria-label="유형·정렬 필터"
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
                      className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
                    >
                      <div className="flex justify-center pb-1 pt-2">
                        <span className="h-1 w-10 rounded-full bg-gray-300" />
                      </div>
                      <div className="border-b border-gray-100 px-4 pb-3 pt-1">
                        <p className="text-center text-sm font-semibold text-gray-900">유형·정렬</p>
                        <p className="mt-0.5 text-center text-xs text-gray-500">{sportTitle}</p>
                      </div>
                      <div className="pb-1">{filterBody}</div>
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
