/**
 * Sprint 1-3 — canonical public URL helpers.
 * Redirect only when a slug exists and the URL param is not already that slug.
 */

export function getTeamPublicSlug(team: {
  slug?: unknown;
  slugLower?: unknown;
} | null | undefined): string | null {
  if (!team) return null;
  const slug = typeof team.slug === "string" ? team.slug.trim() : "";
  if (slug) return slug;
  const lower = typeof team.slugLower === "string" ? team.slugLower.trim() : "";
  return lower || null;
}

/**
 * true → replace() to `/team/{slug}/public`
 * false → keep current URL (no slug, or already on slug)
 */
export function shouldReplaceTeamPublicParamWithSlug(
  urlParam: string | null | undefined,
  slug: string | null | undefined
): boolean {
  const canonical = typeof slug === "string" ? slug.trim() : "";
  if (!canonical) return false;
  const current = String(urlParam || "").trim();
  if (!current) return false;
  // Exact match → already canonical (prevents redirect loop)
  if (current === canonical) return false;
  return true;
}

export function buildTeamPublicPath(
  slugOrId: string,
  search = "",
  hash = ""
): string {
  const base = `/team/${encodeURIComponent(slugOrId)}/public`;
  const q = search && search !== "?" ? (search.startsWith("?") ? search : `?${search}`) : "";
  const h = hash && hash !== "#" ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
  return `${base}${q}${h}`;
}
