import { computeMomentPeakScore } from "@/lib/play/extractAvatarMoments";
import type { SimMatchEvent } from "@/lib/play/simulation";
import { calculatePlayerImpact } from "@/lib/play/simulation";

export type MatchAwardPick = {
  playerId: string;
  displayName: string;
  score: number;
};

/** 이벤트 로그 기본 MVP 점수 — 플레이 탭 공식 MVP에서 재사용 */
export function impactMvpScore(imp: ReturnType<typeof calculatePlayerImpact>): number {
  const offTarget = Math.max(0, imp.shots - imp.shotsOnTarget);
  return (
    imp.goals * 18 +
    imp.shotsOnTarget * 4 +
    offTarget * 0.8 +
    imp.passOk * 2 +
    imp.passFail * 0.35 +
    imp.dribbleOk * 3.5 +
    imp.dribbleFail * 0.45 +
    imp.blocks * 6 +
    imp.saves * 7
  );
}

function uniqHomePlayers(events: readonly SimMatchEvent[]): string[] {
  const s = new Set<string>();
  for (const e of events) {
    if (e.side === "home" && e.playerId?.trim()) s.add(e.playerId.trim());
  }
  return [...s];
}

function pickMax<T>(rows: T[], score: (row: T) => number): T | null {
  if (!rows.length) return null;
  let best = rows[0]!;
  let bestS = score(best);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    const sc = score(r);
    if (sc > bestS) {
      best = r;
      bestS = sc;
    } else if (sc === bestS) {
      const a = (r as { playerId?: string }).playerId ?? "";
      const b = (best as { playerId?: string }).playerId ?? "";
      if (a < b) best = r;
    }
  }
  return best;
}

/**
 * 홈 팀 기준 이벤트·영향력에서 MVP / MOMENT KING(연속 하이라이트 점수) 산출
 */
export function resolveHomeMatchAwards(events: readonly SimMatchEvent[]): {
  mvp: MatchAwardPick | null;
  momentKing: MatchAwardPick | null;
} {
  const ids = uniqHomePlayers(events);
  if (ids.length === 0) return { mvp: null, momentKing: null };

  const byId = ids.map((playerId) => {
    const imp = calculatePlayerImpact(playerId, events);
    const ms = computeMomentPeakScore(events, playerId);
    return {
      playerId,
      displayName: imp.displayName,
      mvpPoints: impactMvpScore(imp),
      momentPoints: ms,
    };
  });

  const mvpRow = pickMax(byId, (r) => r.mvpPoints);
  const momentRow = pickMax(byId, (r) => r.momentPoints);

  return {
    mvp: mvpRow && mvpRow.mvpPoints > 0 ? { playerId: mvpRow.playerId, displayName: mvpRow.displayName, score: mvpRow.mvpPoints } : null,
    momentKing:
      momentRow && momentRow.momentPoints > 0
        ? { playerId: momentRow.playerId, displayName: momentRow.displayName, score: momentRow.momentPoints }
        : null,
  };
}
