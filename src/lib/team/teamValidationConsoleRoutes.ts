/**
 * Vision RC1 — team-scoped Validation Console entry (MP4 upload → visionMatchIndex)
 */

export function teamValidationConsolePath(teamId: string, matchId?: string | null): string {
  const base = `/teams/${encodeURIComponent(teamId)}/validation-console`;
  const trimmed = matchId?.trim();
  if (!trimmed) return base;
  return `${base}?matchId=${encodeURIComponent(trimmed)}`;
}
