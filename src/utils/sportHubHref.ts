import { normalizeSportId, type SportId } from "@/constants/sports";
import type { ActivityFocus } from "@/context/HubContext";

const FALLBACK_SPORT: SportId = "soccer";

/** SportHubPage `VALID_TABS` 와 동기화 */
export type SportHubTab = "market" | "match" | "activity" | "team" | "event";

export const VALID_SPORT_HUB_TABS: SportHubTab[] = [
  "market",
  "match",
  "activity",
  "team",
  "event",
];

/**
 * localStorage·비정상 값에도 항상 유효한 slug 문자열 반환 (null/빈 값 없음)
 */
export function resolveLastSportId(): string {
  try {
    const last = localStorage.getItem("lastSport");
    if (last) {
      const n = normalizeSportId(last);
      if (n) return n;
    }
  } catch {
    /* ignore */
  }
  return FALLBACK_SPORT;
}

export function normalizeSportHubTab(tab: string | null | undefined): SportHubTab {
  if (tab && VALID_SPORT_HUB_TABS.includes(tab as SportHubTab)) {
    return tab as SportHubTab;
  }
  return "market";
}

export function activityFocusToSportHubTab(focus: ActivityFocus): SportHubTab {
  switch (focus) {
    case "trading":
      return "market";
    case "team":
      return "team";
    case "events":
      return "event";
    default:
      return "market";
  }
}

/**
 * 마켓 상품 리스트 단일 라우트 (허브 `?tab=market`와 분리하지 않음)
 * @param extra — 예: 진입 분석용 `source=quick` | `source=category`
 */
export function sportMarketListUrl(
  sportOverride?: string | null,
  extra?: Record<string, string>
): string {
  const sid = (() => {
    if (sportOverride == null || sportOverride === "") return resolveLastSportId();
    const n = normalizeSportId(sportOverride);
    return n ?? resolveLastSportId();
  })();
  const path = `/sports/${encodeURIComponent(sid)}/market`;
  if (!extra || Object.keys(extra).length === 0) return path;
  const q = new URLSearchParams(extra).toString();
  return q ? `${path}?${q}` : path;
}

/**
 * 종목 허브: `market` 탭은 리스트 라우트로 통일, 나머지는 `?tab=...`
 * @param sportOverride — 없으면 lastSport / soccer
 */
export function sportHubHref(tab: SportHubTab, sportOverride?: string | null): string {
  const safe = normalizeSportHubTab(tab);
  const sid = (() => {
    if (sportOverride == null || sportOverride === "") return resolveLastSportId();
    const n = normalizeSportId(sportOverride);
    return n ?? resolveLastSportId();
  })();
  if (safe === "market") {
    return sportMarketListUrl(sid);
  }
  return `/sports/${encodeURIComponent(sid)}?tab=${encodeURIComponent(safe)}`;
}

export function isSportHubTabActive(
  pathname: string,
  search: string,
  tab: SportHubTab
): boolean {
  if (!pathname.startsWith("/sports/")) return false;
  if (tab === "market") {
    return /\/sports\/[^/]+\/market(\/|$)/.test(pathname);
  }
  const t = new URLSearchParams(search).get("tab");
  return normalizeSportHubTab(t) === tab;
}

/**
 * 마켓 글 canonical 상세 URL (종목 맥락 포함)
 */
export function sportMarketDetailUrl(sport: string, postId: string): string {
  const sid = normalizeSportId(sport) ?? resolveLastSportId();
  return `/sports/${encodeURIComponent(sid)}/market/${encodeURIComponent(postId)}`;
}

/**
 * `/federations/{slug}` — users 문서의 협회 slug (ID를 URL에 넣지 않음)
 */
export function pickFederationSlug(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const a = data.preferredFederationSlug;
  if (typeof a === "string" && a.trim()) return a.trim();
  const b = data.linkedFederationSlug;
  if (typeof b === "string" && b.trim()) return b.trim();
  const slugs = data.federationSlugs;
  if (Array.isArray(slugs) && slugs.length > 0 && typeof slugs[0] === "string" && slugs[0].trim()) {
    return slugs[0].trim();
  }
  return null;
}
