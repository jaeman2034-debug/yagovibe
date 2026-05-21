const KEY = "pendingInviteTeamId";

function normalizeTeamId(raw: unknown): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (v.includes("/") || v.includes("\\") || v === "." || v === "..") return "";
  return v;
}

export function setPendingInviteTeamId(teamId: unknown): void {
  const v = normalizeTeamId(teamId);
  if (!v) return;
  localStorage.setItem(KEY, v);
}

export function getPendingInviteTeamId(): string | null {
  const v = normalizeTeamId(localStorage.getItem(KEY));
  return v || null;
}

export function clearPendingInviteTeamId(): void {
  localStorage.removeItem(KEY);
}
