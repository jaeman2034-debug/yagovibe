/**
 * Pure parsers for createTeam callable results (Sprint 1-4).
 * No Firebase imports — safe for unit tests.
 */

export function isValidTeamId(id: string | null | undefined): id is string {
  return !!id && id !== "null" && id !== "undefined";
}

/** Sprint 1-1 slug shape (lowercase ascii + hyphens). */
export function isValidTeamPublicSlug(slug: string | null | undefined): slug is string {
  if (typeof slug !== "string") return false;
  const s = slug.trim();
  if (!s || s === "null" || s === "undefined") return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

/** Prefer slug for public home URL; fall back to canonical teamId. */
export function resolveTeamPublicUrlKey(teamId: string, slug?: string | null): string {
  if (isValidTeamPublicSlug(slug)) return slug.trim();
  return teamId;
}

function readCallableDataField(result: unknown, field: "teamId" | "slug"): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const data = r.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const v = d[field];
    if (typeof v === "string") return v;
    const nested = d.data;
    if (nested && typeof nested === "object") {
      const nv = (nested as Record<string, unknown>)[field];
      if (typeof nv === "string") return nv;
    }
  }
  const top = r[field];
  return typeof top === "string" ? top : null;
}

export function parseTeamIdFromCallableResult(result: unknown): string | null {
  const tid = readCallableDataField(result, "teamId");
  return isValidTeamId(tid) ? tid : null;
}

export function parseSlugFromCallableResult(result: unknown): string | null {
  const slug = readCallableDataField(result, "slug");
  return isValidTeamPublicSlug(slug) ? slug.trim() : null;
}
