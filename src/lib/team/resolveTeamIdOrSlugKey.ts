/**
 * Normalize URL param for team public slug lookup (Sprint 1-2).
 * Canonical teamId lookup uses the raw trimmed value; slug lookup uses lowercased form.
 */
export function normalizeTeamIdOrSlugParam(idOrSlug: string): {
  raw: string;
  slugLower: string;
} {
  const raw = String(idOrSlug || "").trim();
  return { raw, slugLower: raw.toLowerCase() };
}
