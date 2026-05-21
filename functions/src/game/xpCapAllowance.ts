/**
 * 글로벌·소스별 일일 캡 + 주간 캡 (서버 트랜잭션 내에서만 갱신)
 */
import { XP_POLICY, type XpAwardSource } from "../config/xpPolicy";
import { getSeoulDateKey, getSeoulWeekKey } from "./xpTimeKeys";

export type GameXpCapState = {
  dailyKey: string;
  weeklyKey: string;
  dailyTotal: number;
  weeklyTotal: number;
  bySource: Record<XpAwardSource, number>;
};

function emptyBySource(): Record<XpAwardSource, number> {
  return {
    miniShotDaily: 0,
    miniShotSession: 0,
    marketComplete: 0,
    marketReview: 0,
    seasonSettlement: 0,
  };
}

function parseCapRaw(raw: unknown): {
  dailyKey?: string;
  weeklyKey?: string;
  dailyTotal?: number;
  weeklyTotal?: number;
  bySource?: Partial<Record<XpAwardSource, number>>;
} {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    dailyKey: typeof o.dailyKey === "string" ? o.dailyKey : undefined,
    weeklyKey: typeof o.weeklyKey === "string" ? o.weeklyKey : undefined,
    dailyTotal: typeof o.dailyTotal === "number" && Number.isFinite(o.dailyTotal) ? o.dailyTotal : undefined,
    weeklyTotal: typeof o.weeklyTotal === "number" && Number.isFinite(o.weeklyTotal) ? o.weeklyTotal : undefined,
    bySource:
      o.bySource && typeof o.bySource === "object"
        ? (o.bySource as Partial<Record<XpAwardSource, number>>)
        : undefined,
  };
}

function alignStateToCurrentPeriods(
  state: GameXpCapState,
  dayKey: string,
  weekKey: string
): GameXpCapState {
  const next: GameXpCapState = {
    ...state,
    bySource: { ...state.bySource },
  };
  if (next.weeklyKey !== weekKey) {
    next.weeklyKey = weekKey;
    next.weeklyTotal = 0;
  }
  if (next.dailyKey !== dayKey) {
    next.dailyKey = dayKey;
    next.dailyTotal = 0;
    next.bySource = emptyBySource();
  }
  return next;
}

export function readGameXpCapState(userData: Record<string, unknown> | undefined): GameXpCapState {
  const raw = parseCapRaw(userData?.gameXpCap);
  const base: GameXpCapState = {
    dailyKey: typeof raw.dailyKey === "string" ? raw.dailyKey : "",
    weeklyKey: typeof raw.weeklyKey === "string" ? raw.weeklyKey : "",
    dailyTotal: Math.max(0, Math.floor(Number(raw.dailyTotal) || 0)),
    weeklyTotal: Math.max(0, Math.floor(Number(raw.weeklyTotal) || 0)),
    bySource: { ...emptyBySource(), ...raw.bySource },
  };
  for (const k of Object.keys(base.bySource) as XpAwardSource[]) {
    base.bySource[k] = Math.max(0, Math.floor(Number(base.bySource[k]) || 0));
  }
  return base;
}

/**
 * 요청 XP에 대해 캡을 적용한 실제 부여분과, users.gameXpCap 에 쓸 최종 스냅샷
 */
export function computeGameXpAllowance(
  userData: Record<string, unknown> | undefined,
  requestedXp: number,
  source: XpAwardSource,
  now: Date = new Date()
): { allowed: number; requested: number; gameXpCap: GameXpCapState } {
  const requested = Math.max(0, Math.floor(Number(requestedXp) || 0));
  const dayKey = getSeoulDateKey(now);
  const weekKey = getSeoulWeekKey(now);

  let state = readGameXpCapState(userData);
  state = alignStateToCurrentPeriods(state, dayKey, weekKey);

  const { CAP } = XP_POLICY;
  const remDailyTotal = CAP.DAILY_TOTAL - state.dailyTotal;
  const remWeeklyTotal = CAP.WEEKLY_TOTAL - state.weeklyTotal;
  const srcCeil = CAP.DAILY_BY_SOURCE[source];
  const remSourceDay = srcCeil - state.bySource[source];

  const allowed = Math.max(
    0,
    Math.min(requested, remDailyTotal, remWeeklyTotal, remSourceDay)
  );

  if (allowed > 0) {
    state.dailyTotal += allowed;
    state.weeklyTotal += allowed;
    state.bySource[source] += allowed;
  }

  return { allowed, requested, gameXpCap: state };
}
