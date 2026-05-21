import type { SimMatchEvent } from "@/lib/play/simulation";

function scoreStreak(events: readonly SimMatchEvent[]): number {
  let sc = 0;
  for (const e of events) {
    if (e.type === "pass") sc += e.success ? 2 : 1;
    else if (e.type === "dribble") sc += e.success ? 3 : 1;
    else if (e.type === "shot") {
      if (e.goal) sc += 12;
      else if (e.success && !e.blocked) sc += 4;
      else sc += 1;
    }
  }
  return sc;
}

/**
 * 동일 선수의 공격 이벤트 연속 구간 중 가장 극적인 묶음 (영화식 하이라이트용)
 */
export function extractHighlightMomentSequence(
  events: readonly SimMatchEvent[],
  playerId: string,
  maxLines = 8
): SimMatchEvent[] {
  const pid = typeof playerId === "string" ? playerId.trim() : "";
  if (!pid) return [];

  const mine: SimMatchEvent[] = [];
  for (const e of events) {
    if (e.playerId !== pid) continue;
    if (e.type === "pass" || e.type === "dribble" || e.type === "shot") mine.push(e);
  }
  if (mine.length === 0) return [];

  const streaks: SimMatchEvent[][] = [];
  let cur: SimMatchEvent[] = [];
  for (const e of mine) {
    if (cur.length === 0) {
      cur.push(e);
      continue;
    }
    const prev = cur[cur.length - 1];
    if (e.minute - prev.minute <= 2) cur.push(e);
    else {
      streaks.push(cur);
      cur = [e];
    }
  }
  if (cur.length) streaks.push(cur);

  let best = streaks[0] ?? [];
  let bestScore = scoreStreak(best);
  for (const s of streaks) {
    const sc = scoreStreak(s);
    if (sc > bestScore || (sc === bestScore && s.length > best.length)) {
      best = s;
      bestScore = sc;
    }
  }

  if (bestScore >= 3 && best.length >= 2) return best.slice(0, maxLines);

  const goals = mine.filter((e) => e.goal);
  if (goals.length > 0) return goals.slice(0, maxLines);

  return mine.slice(0, Math.min(maxLines, 4));
}

/**
 * 선수별 최고 하이라이트 구간의 극적 점수 (MOMENT KING 비교용)
 */
export function computeMomentPeakScore(events: readonly SimMatchEvent[], playerId: string): number {
  const pid = typeof playerId === "string" ? playerId.trim() : "";
  if (!pid) return 0;

  const mine: SimMatchEvent[] = [];
  for (const e of events) {
    if (e.playerId !== pid) continue;
    if (e.type === "pass" || e.type === "dribble" || e.type === "shot") mine.push(e);
  }
  if (mine.length === 0) return 0;

  const streaks: SimMatchEvent[][] = [];
  let cur: SimMatchEvent[] = [];
  for (const e of mine) {
    if (cur.length === 0) {
      cur.push(e);
      continue;
    }
    const prev = cur[cur.length - 1];
    if (e.minute - prev.minute <= 2) cur.push(e);
    else {
      streaks.push(cur);
      cur = [e];
    }
  }
  if (cur.length) streaks.push(cur);

  let bestScore = 0;
  for (const s of streaks) bestScore = Math.max(bestScore, scoreStreak(s));

  const goals = mine.filter((e) => e.goal);
  if (goals.length > 0) bestScore = Math.max(bestScore, scoreStreak(goals));

  return bestScore;
}

