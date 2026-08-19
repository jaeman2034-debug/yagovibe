export function formatMatchDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "—";
  const sec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatPercent(ratio: number | null | undefined, digits = 0): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${(Math.min(1, Math.max(0, ratio)) * 100).toFixed(digits)}%`;
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export function formatInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

const RATING_BADGE_LABELS: Record<string, string> = {
  top_attack: "공격 핵심",
  playmaker: "플레이메이커",
  finisher: "결정력",
  ball_winner: "볼 하이저",
  engine: "엔진",
  threat_creator: "위협 창출",
};

export function formatRatingBadge(badge: string): string {
  return RATING_BADGE_LABELS[badge] ?? badge;
}

export function formatRatingScore(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.round(Math.min(100, Math.max(0, n))));
}
