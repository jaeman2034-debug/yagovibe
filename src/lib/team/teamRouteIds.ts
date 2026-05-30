/**
 * React Router `:teamId` 플레이스홀더가 URL에 그대로 남는 경우 방지.
 * (레거시 Navigate, 잘못된 상대경로, 문서 URL 북마크 등)
 */
export function isPlaceholderRouteParam(value: string | undefined | null): boolean {
  if (value == null) return true;
  const v = String(value).trim();
  if (!v) return true;
  if (v.startsWith(":")) return true;
  if (v === "teamId" || v === ":teamId" || v === "{teamId}") return true;
  return false;
}

export function normalizeRouteTeamId(value: string | undefined | null): string | null {
  if (isPlaceholderRouteParam(value)) return null;
  return String(value).trim();
}
