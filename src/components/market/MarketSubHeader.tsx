/**
 * 마켓 서브 헤더 — 유형·정렬은 ⋮ 패널(모바일 바텀시트 / 데스크톱 포털 드롭다운),
 * 현재 선택값은 칩으로 항상 노출.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MarketServiceType = "market" | "free" | "lost";

/** 지도·서브헤더 정렬 (가격 기준) */
export type MarketSubHeaderSortType = "latest" | "price_low" | "price_high";

interface MarketSubHeaderProps {
  serviceType: MarketServiceType;
  onServiceTypeChange: (type: MarketServiceType) => void;
  sortMode?: string;
  onSortModeChange?: (mode: string) => void;
  sortType?: MarketSubHeaderSortType;
  onSortTypeChange?: (type: MarketSubHeaderSortType) => void;
  user?: unknown;
  userLoc?: unknown;
  /** 필터 패널 열림 (모바일 시트 등) */
  onMenuOpenChange?: (open: boolean) => void;
  /** 상단 왼쪽 요약 (예: 종목명) — 없으면 생략 */
  leadingSummary?: string | null;
  /** 지도 풀스크린 오버레이: 배경·패딩 축소 */
  variant?: "default" | "mapOverlay";
}

const SERVICE_TABS: Array<{ type: MarketServiceType; label: string; icon: string }> = [
  { type: "market", label: "중고거래", icon: "🛒" },
  { type: "free", label: "나눔", icon: "🎁" },
  { type: "lost", label: "유실물", icon: "🔍" },
];

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

function serviceLabel(type: MarketServiceType): string {
  return SERVICE_TABS.find((t) => t.type === type)?.label ?? "";
}

function sortLabel(t: MarketSubHeaderSortType | undefined): string {
  switch (t) {
    case "price_low":
      return "가격 낮은순";
    case "price_high":
      return "가격 높은순";
    case "latest":
    default:
      return "최신순";
  }
}

function scrollTopSmooth() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const FILTER_SHEET_Z = "z-[100052]";
const triggerBtnClass =
  "shrink-0 inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100";

type MarketUnifiedFilterMenuProps = {
  serviceType: MarketServiceType;
  onServiceTypeChange: (type: MarketServiceType) => void;
  sortType?: MarketSubHeaderSortType;
  onSortTypeChange?: (type: MarketSubHeaderSortType) => void;
  user?: unknown;
  userLoc?: unknown;
  onMenuOpenChange?: (open: boolean) => void;
};

function MarketUnifiedFilterMenu({
  serviceType,
  onServiceTypeChange,
  sortType = "latest",
  onSortTypeChange,
  user: _user,
  userLoc: _userLoc,
  onMenuOpenChange,
}: MarketUnifiedFilterMenuProps) {
  const mdUp = useMediaMdUp();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetPanelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const panelOpen = mdUp ? false : sheetOpen;
  useBodyScrollLock(panelOpen);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    if (mdUp) setSheetOpen(false);
  }, [mdUp]);

  useEffect(() => {
    onMenuOpenChange?.(sheetOpen && !mdUp);
  }, [sheetOpen, mdUp, onMenuOpenChange]);

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

  const handleService = (type: MarketServiceType) => {
    onServiceTypeChange(type);
    closeSheet();
    scrollTopSmooth();
  };

  const handleSort = (next: MarketSubHeaderSortType) => {
    onSortTypeChange?.(next);
    closeSheet();
    scrollTopSmooth();
  };

  const sectionTitle = "px-3 py-2 text-[11px] font-semibold text-gray-500";
  const rowActive = "font-semibold text-blue-600";
  const rowBase =
    "flex min-h-[48px] w-full items-center justify-between px-4 text-left text-base text-gray-900 active:bg-gray-100";

  const filterPanelInner = (
    <>
      <div className={sectionTitle}>유형</div>
      {SERVICE_TABS.map((tab) => {
        const active = serviceType === tab.type;
        return (
          <button
            key={tab.type}
            type="button"
            className={`${rowBase} ${active ? rowActive : ""}`}
            onClick={() => handleService(tab.type)}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>{tab.icon}</span>
              {tab.label}
            </span>
            {active ? <span aria-hidden>✓</span> : null}
          </button>
        );
      })}

      <div className="my-1 border-t border-gray-100" role="presentation" />

      <div className={sectionTitle}>정렬</div>
      {(
        [
          { id: "latest" as const, label: "최신순" },
          { id: "price_low" as const, label: "가격 낮은순" },
          { id: "price_high" as const, label: "가격 높은순" },
        ] as const
      ).map((row) => {
        const active = sortType === row.id;
        return (
          <button
            key={row.id}
            type="button"
            className={`${rowBase} ${active ? rowActive : ""}`}
            onClick={() => handleSort(row.id)}
          >
            <span>{row.label}</span>
            {active ? <span aria-hidden>✓</span> : null}
          </button>
        );
      })}

      <div className="my-1 border-t border-gray-100" role="presentation" />

      <div className={sectionTitle}>기타</div>
      <button
        type="button"
        className={`${rowBase} text-gray-600`}
        onClick={() => {
          closeSheet();
          // eslint-disable-next-line no-console
          console.log("필터");
        }}
      >
        필터
      </button>
      <button
        type="button"
        className={`${rowBase} text-gray-600`}
        onClick={() => {
          closeSheet();
          // eslint-disable-next-line no-console
          console.log("지역변경");
        }}
      >
        지역변경
      </button>
    </>
  );

  const desktopSection = (title: string) => (
    <div className="pointer-events-none px-2 py-1.5 text-xs font-semibold text-gray-500">{title}</div>
  );

  const desktopRowClass = "min-h-[44px] flex items-center justify-between";

  return (
    <>
      {mdUp ? (
        <DropdownMenu portal>
          <DropdownMenuTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              className={triggerBtnClass}
              aria-label="유형·정렬 필터"
            >
              <MoreVertical className="h-5 w-5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {desktopSection("유형")}
            {SERVICE_TABS.map((tab) => (
              <DropdownMenuItem
                key={tab.type}
                className={desktopRowClass}
                onClick={() => {
                  onServiceTypeChange(tab.type);
                  scrollTopSmooth();
                }}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden>{tab.icon}</span>
                  {tab.label}
                </span>
                {serviceType === tab.type ? <span className="text-blue-600">✓</span> : null}
              </DropdownMenuItem>
            ))}
            <div className="my-1 border-t border-gray-100" role="presentation" />
            {desktopSection("정렬")}
            <DropdownMenuItem
              className={desktopRowClass}
              onClick={() => {
                onSortTypeChange?.("latest");
                scrollTopSmooth();
              }}
            >
              <span>최신순</span>
              {sortType === "latest" ? <span className="text-blue-600">✓</span> : null}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={desktopRowClass}
              onClick={() => {
                onSortTypeChange?.("price_low");
                scrollTopSmooth();
              }}
            >
              <span>가격 낮은순</span>
              {sortType === "price_low" ? <span className="text-blue-600">✓</span> : null}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={desktopRowClass}
              onClick={() => {
                onSortTypeChange?.("price_high");
                scrollTopSmooth();
              }}
            >
              <span>가격 높은순</span>
              {sortType === "price_high" ? <span className="text-blue-600">✓</span> : null}
            </DropdownMenuItem>
            <div className="my-1 border-t border-gray-100" role="presentation" />
            {desktopSection("기타")}
            <DropdownMenuItem
              className={desktopRowClass}
              closeOnSelect
              onClick={() => {
                // eslint-disable-next-line no-console
                console.log("필터");
              }}
            >
              필터
            </DropdownMenuItem>
            <DropdownMenuItem
              className={desktopRowClass}
              closeOnSelect
              onClick={() => {
                // eslint-disable-next-line no-console
                console.log("지역변경");
              }}
            >
              지역변경
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
                      <p className="mt-0.5 text-center text-xs text-gray-500">원하는 조건을 선택하세요</p>
                    </div>
                    <div className="pb-1">{filterPanelInner}</div>
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
    </>
  );
}

export default function MarketSubHeader({
  serviceType,
  onServiceTypeChange,
  sortMode: _sortMode,
  onSortModeChange: _onSortModeChange,
  sortType,
  onSortTypeChange,
  user,
  userLoc,
  leadingSummary,
  onMenuOpenChange,
  variant = "default",
}: MarketSubHeaderProps) {
  const overlay = variant === "mapOverlay";
  return (
    <div className={overlay ? "bg-transparent" : "bg-white"}>
      <div className={overlay ? "px-1.5 py-1" : "px-4 py-2"}>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {leadingSummary ? (
              <span className="max-w-[40%] truncate text-sm font-semibold text-gray-900 sm:max-w-none">
                {leadingSummary}
              </span>
            ) : null}
            <span
              className="max-w-full truncate rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-100"
              title={serviceLabel(serviceType)}
            >
              {serviceLabel(serviceType)}
            </span>
            <span
              className="max-w-full truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 ring-1 ring-gray-200/80"
              title={sortLabel(sortType)}
            >
              {sortLabel(sortType)}
            </span>
          </div>
          <MarketUnifiedFilterMenu
            serviceType={serviceType}
            onServiceTypeChange={onServiceTypeChange}
            sortType={sortType}
            onSortTypeChange={onSortTypeChange}
            user={user}
            userLoc={userLoc}
            onMenuOpenChange={onMenuOpenChange}
          />
        </div>
      </div>
    </div>
  );
}
