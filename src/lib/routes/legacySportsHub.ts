/**
 * L2-C legacy route — `/sports-hub` is NOT canonical.
 * @see docs/YAGO_SPORTS_CATEGORY_ARCHITECTURE.md §1.1
 * @see docs/YAGO_ARCHITECTURE_CONSTITUTION.md ARTICLE 7
 *
 * DO NOT add new features, links, or navigations to `/sports-hub`.
 * Canonical platform entry: PLATFORM_HUB_PATH (`/hub`).
 */

import { normalizeSportId } from "@/constants/sports";

/** Canonical platform hub (L1). */
export const PLATFORM_HUB_PATH = "/hub" as const;

/**
 * @deprecated Redirect-only. Never use in new UI or deep links.
 */
export const LEGACY_SPORTS_HUB_PATH = "/sports-hub" as const;

/**
 * Resolve redirect target for a legacy `/sports-hub` URL.
 * - `?category=basketball` (or `sport`) → `/sports/{slug}` (종목 허브)
 * - otherwise → `/hub`
 */
export function resolveLegacySportsHubRedirect(search: string = ""): string {
  const qs = search.startsWith("?") ? search.slice(1) : search;
  if (!qs) return PLATFORM_HUB_PATH;

  const params = new URLSearchParams(qs);
  const raw = params.get("category") ?? params.get("sport");
  if (raw) {
    const sid = normalizeSportId(raw.trim());
    if (sid) return `/sports/${encodeURIComponent(sid)}`;
  }

  return PLATFORM_HUB_PATH;
}

/** Post-login / notification paths: rewrite legacy hub URL to canonical. */
export function normalizePathIfLegacySportsHub(pathWithSearch: string): string {
  const [pathname, search = ""] = pathWithSearch.split("?");
  if (pathname !== LEGACY_SPORTS_HUB_PATH && !pathname.startsWith(`${LEGACY_SPORTS_HUB_PATH}/`)) {
    return pathWithSearch;
  }
  const target = resolveLegacySportsHubRedirect(search ? `?${search}` : "");
  return target;
}
