import { extractHighlightMomentSequence } from "@/lib/play/extractAvatarMoments";
import type { SimMatchEvent } from "@/lib/play/simulation";

/** MVP 선수 관점 MOMENT — 하이라이트 추출 후 없으면 시간순 공격 이벤트 */
export function buildMvpMomentSequence(events: readonly SimMatchEvent[], mvpMemberId: string): SimMatchEvent[] {
  const pid = mvpMemberId.trim();
  if (!pid || events.length === 0) return [];

  const seq = extractHighlightMomentSequence(events, pid, 12);
  if (seq.length > 0) return seq;

  const raw = events.filter(
    (e) =>
      e.side === "home" &&
      e.playerId === pid &&
      (e.type === "pass" || e.type === "dribble" || e.type === "shot")
  );
  return [...raw].sort((a, b) => a.minute - b.minute).slice(0, 12);
}
