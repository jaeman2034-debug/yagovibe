import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  MARKET_TRADE_ENTRY_OPTIONS,
  type MarketTradeService,
} from "./marketPostTypeOptions";

type Sport = string;
type MarketCategory =
  | "all"
  | "equipment"
  | "recruit"
  | "match"
  | "lesson"
  | "ground"
  | "ticket";

const LAST_SERVICE_KEY = "yago.v1.fabMarketTradeService";

function readStoredService(): MarketTradeService | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const v = window.localStorage.getItem(LAST_SERVICE_KEY);
    if (v === "market" || v === "free" || v === "lost") return v;
  } catch {
    /* ignore */
  }
  return undefined;
}

function writeStoredService(id: MarketTradeService) {
  try {
    window.localStorage.setItem(LAST_SERVICE_KEY, id);
  } catch {
    /* ignore */
  }
}

function resolveHighlightedService(
  currentService: MarketTradeService | undefined,
  currentCategory: MarketCategory | undefined
): MarketTradeService | undefined {
  if (
    currentService &&
    MARKET_TRADE_ENTRY_OPTIONS.some((o) => o.id === currentService)
  ) {
    return currentService;
  }
  if (currentCategory === "equipment") return "market";
  return undefined;
}

export interface MarketFabCreateContentProps {
  sport: Sport;
  /** URL `?service=market|free|lost` */
  currentService?: MarketTradeService;
  /** 목록 필터 등: equipment 선택 시 중고 항목 강조 */
  currentCategory?: MarketCategory;
  onClose: () => void;
}

export function MarketFabCreateContent({
  sport,
  currentService,
  currentCategory,
  onClose,
}: MarketFabCreateContentProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const source = useMemo<"hub" | "category" | "market">(() => {
    const p = location.pathname;
    if (p.startsWith("/hub")) return "hub";
    if (p.startsWith("/sports/")) return "category";
    return "market";
  }, [location.pathname]);

  const highlight = useMemo(
    () => resolveHighlightedService(currentService, currentCategory),
    [currentService, currentCategory]
  );

  // 고정 순서 유지: 판매 → 나눔 → 유실물 (사용 빈도 기준)
  // 강조는 뱃지로만 표시하고 순서는 바꾸지 않는다.
  const sorted = MARKET_TRADE_ENTRY_OPTIONS;

  const handleSelect = (option: (typeof MARKET_TRADE_ENTRY_OPTIONS)[number]) => {
    const gtag = (window as Window & { gtag?: (...a: unknown[]) => void }).gtag;
    gtag?.("event", "market_trade_entry_selected", {
      sport,
      service: option.id,
      label: option.label,
    });
    writeStoredService(option.id);
    navigate(option.buildRoute(sport), {
      state: { from: source, sport },
    });
    onClose();
  };

  return (
    <div className="menu-list grid gap-3 mt-2">
      {sorted.map((option) => {
        const isCurrent = highlight === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => handleSelect(option)}
            className={cn(
              "bg-white border rounded-[14px] px-5 py-[18px] text-left transition-all duration-150",
              "flex items-center justify-between hover:bg-gray-50 hover:-translate-y-[1px] active:scale-[0.98] group",
              isCurrent
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : "border-gray-200"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl flex-shrink-0" aria-hidden>
                {option.icon}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {option.label}
                </h3>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </div>
            <div className="flex flex-shrink-0 ml-4 items-center gap-2">
              {isCurrent && (
                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                  현재
                </span>
              )}
              <span className="text-gray-400 text-lg" aria-hidden>
                →
              </span>
            </div>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => {
          const gtag = (window as Window & { gtag?: (...a: unknown[]) => void }).gtag;
          gtag?.("event", "market_ai_entry_selected", { sport });
          navigate(`/sports/${sport}/market/ai-create`, {
            state: { from: source, sport },
          });
          onClose();
        }}
        className={cn(
          "bg-white border rounded-[14px] px-5 py-[18px] text-left transition-all duration-150",
          "flex items-center justify-between hover:bg-gray-50 hover:-translate-y-[1px] active:scale-[0.98] group border-purple-200"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0" aria-hidden>
            ✨
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-1">AI 등록</h3>
            <p className="text-sm text-gray-500">이미지/음성 기반 고급 등록 화면</p>
          </div>
        </div>
        <span className="text-gray-400 text-lg" aria-hidden>
          →
        </span>
      </button>
    </div>
  );
}
