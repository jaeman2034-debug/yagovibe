import type { SimMatchEvent } from "@/lib/play/simulation";

/** MOMENT 한 줄 요약 (타임라인 재생용) */
export function compactMomentKo(e: SimMatchEvent): string {
  if (e.type === "pass") return e.success ? "패스 성공" : "패스 압박";
  if (e.type === "dribble") return e.success ? "돌파" : "압박";
  if (e.type === "shot") {
    if (e.blocked) return "슛 차단";
    if (e.goal) return "슛 → 골 ⚽";
    if (e.success) return "유효슛";
    return "슛 빗나감";
  }
  return String(e.type);
}
