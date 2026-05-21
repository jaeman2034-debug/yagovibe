import { normalizeSportId } from "@/constants/sports";
import type { Sport, MarketCategory } from "@/types/market";
import type { MarketTradeService } from "./marketPostTypeOptions";

const SPORT_SEGMENTS: readonly string[] = [
  "baseball",
  "soccer",
  "basketball",
  "volleyball",
  "golf",
  "tennis",
  "running",
  "hiking",
  "badminton",
  "table-tennis",
  "swimming",
  "fitness",
  "yoga",
  "climbing",
  "billiards",
  "misc",
  "other",
  "all",
];

const MARKET_PATH_RE = /^\/sports\/[^/]+\/market(\/|$)/;

export function isMarketFabPath(pathname: string): boolean {
  return (
    pathname.startsWith("/market") ||
    pathname.startsWith("/trade") ||
    pathname.startsWith("/app/market") ||
    MARKET_PATH_RE.test(pathname)
  );
}

export function isFederationFabPath(pathname: string): boolean {
  return (
    pathname.startsWith("/federations/") || pathname.startsWith("/federation/")
  );
}

export function sportForMarketFab(pathname: string): Sport {
  const m = pathname.match(/^\/sports\/([^/]+)\/market(?:\/|$)/);
  if (m && SPORT_SEGMENTS.includes(m[1])) return m[1] as Sport;
  return "soccer";
}

/**
 * FAB·글쓰기 모달에서 `/sports/:sport/market/create` 등으로 이동할 때 쓰는 종목 슬러그.
 * - 레이아웃에서 넘긴 `sport` 우선
 * - 그다음 URL `/sports/:segment/` 의 segment가 `normalizeSportId`로 유효할 때만 사용
 *   (`sportProp ?? sportForMarketFab` 만 쓰면 `/sports/baseball?tab=…` 에서도 항상 soccer로 덮어쓰는 버그 발생)
 * - `/sports/…/market/…` canonical 은 sportForMarketFab
 * - `all`·미인식 → soccer
 */
export function resolveSportSlugForCreate(pathname: string, sportProp?: string): string {
  const fromProp = normalizeSportId(sportProp);
  if (fromProp && fromProp !== "all") return fromProp;

  const secondSeg = pathname.match(/^\/sports\/([^/]+)(?:\/|$|\?|#)/)?.[1];
  const fromSports = normalizeSportId(secondSeg);
  if (fromSports && fromSports !== "all") return fromSports;

  const slug = sportForMarketFab(pathname) as string;
  return slug === "all" ? "soccer" : slug;
}

export function tradeServiceFromSearchParams(
  serviceParam: string | null
): MarketTradeService | undefined {
  if (serviceParam === "market" || serviceParam === "free" || serviceParam === "lost") {
    return serviceParam;
  }
  return undefined;
}

export function categoryFromSearchParams(
  categoryParam: string | null
): MarketCategory | undefined {
  if (!categoryParam) return undefined;
  const allowed: MarketCategory[] = [
    "all",
    "equipment",
    "recruit",
    "match",
    "lesson",
    "ground",
    "ticket",
  ];
  return allowed.includes(categoryParam as MarketCategory)
    ? (categoryParam as MarketCategory)
    : undefined;
}
