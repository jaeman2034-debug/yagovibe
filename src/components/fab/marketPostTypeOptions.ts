import type { Sport } from "@/types/market";
import { SPORT_CATEGORIES } from "@/constants/sportCategories";

const VALID_TRADE_SPORT_IDS = new Set(SPORT_CATEGORIES.map((c) => c.id));

/** MarketAddPage `?service=` 값과 동일 */
export type MarketTradeService = "market" | "free" | "lost";

/**
 * 스포츠 허브 Sport → `/trade/create` 폼에서 쓰는 종목 id (SPORT_CATEGORIES 기준)
 */
export function mapHubSportToTradeCreateSportParam(sport: Sport): string | null {
  if (sport === "all") return null;
  const map: Partial<Record<Sport, string>> = {
    "table-tennis": "pingpong",
    hiking: "outdoor",
    misc: "goods",
    other: "etc",
  };
  const raw = map[sport] ?? sport;
  return VALID_TRADE_SPORT_IDS.has(raw) ? raw : null;
}

export function buildTradeCreateUrl(sport: Sport, service: MarketTradeService): string {
  // UX 정책: 스포츠 허브 컨텍스트에서는 /sports/:sport/market/create로 직행
  // type 매핑: market→sale, free→share, lost→lost
  const serviceToType: Record<MarketTradeService, "sale" | "share" | "lost"> = {
    market: "sale",
    free: "share",
    lost: "lost",
  };
  const type = serviceToType[service];
  const params = new URLSearchParams();
  params.set("type", type);
  return `/sports/${sport}/market/create?${params.toString()}`;
}

export interface MarketTradeEntryOption {
  id: MarketTradeService;
  label: string;
  description: string;
  icon: string;
  buildRoute: (sport: Sport) => string;
}

/** FAB 1차 선택: 판매 / 나눔 / 유실물 → 실제 등록 폼(MarketAddPage) */
export const MARKET_TRADE_ENTRY_OPTIONS: MarketTradeEntryOption[] = [
  {
    id: "market",
    label: "판매하기",
    description: "중고 장비를 판매합니다",
    icon: "🛍️",
    buildRoute: (s) => buildTradeCreateUrl(s, "market"),
  },
  {
    id: "free",
    label: "나눔하기",
    description: "무료로 나눔합니다",
    icon: "🎁",
    buildRoute: (s) => buildTradeCreateUrl(s, "free"),
  },
  {
    id: "lost",
    label: "유실물 등록",
    description: "분실/습득 물품을 등록합니다",
    icon: "🔍",
    buildRoute: (s) => buildTradeCreateUrl(s, "lost"),
  },
];
