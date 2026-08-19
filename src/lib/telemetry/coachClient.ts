import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type {
  AdaptiveCoachPlanClient,
  CoachFocusAreaClient,
  CoachLastRecommendationClient,
  CoachPlanClient,
  CoachProfileFieldsClient,
  CoachTrendStatusClient,
} from "./coachTypes";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseFocusArea(v: unknown): CoachFocusAreaClient {
  const s = str(v);
  if (
    s === "Passing" ||
    s === "Control" ||
    s === "Finishing" ||
    s === "Threat Creation" ||
    s === "Possession" ||
    s === "General"
  ) {
    return s;
  }
  return "General";
}

function parseTrendStatus(v: unknown): CoachTrendStatusClient {
  if (v === "improving" || v === "declining" || v === "plateau") return v;
  return "plateau";
}

function parseLastRecommendation(raw: unknown): CoachLastRecommendationClient | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    focusArea: parseFocusArea(o.focusArea),
    target: str(o.target) || "Improve one core metric",
    drills: Array.isArray(o.drills) ? o.drills.filter((d): d is string => typeof d === "string") : [],
    diagnosis: str(o.diagnosis),
    timeframe: str(o.timeframe) || "Next 3 matches",
  };
}

export function parseCoachPlan(raw: unknown): CoachPlanClient | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (num(p.version) !== 1) return null;
  return {
    version: 1,
    diagnosis: str(p.diagnosis) || "Training focus in progress",
    focusArea: parseFocusArea(p.focusArea),
    focusTrend: parseTrendStatus(p.focusTrend),
    drills: Array.isArray(p.drills) ? p.drills.filter((d): d is string => typeof d === "string") : [],
    target: str(p.target) || "Improve one core metric",
    timeframe: str(p.timeframe) || "Next 3 matches",
    streak: Math.max(0, num(p.streak) ?? 0),
  };
}

export function parseCoachProfileFields(raw: unknown): CoachProfileFieldsClient {
  if (!raw || typeof raw !== "object") {
    return {
      coachFocusArea: null,
      coachFocusSince: null,
      coachStreak: 0,
      coachLastRecommendation: null,
    };
  }
  const o = raw as Record<string, unknown>;
  return {
    coachFocusArea: o.coachFocusArea ? parseFocusArea(o.coachFocusArea) : null,
    coachFocusSince: num(o.coachFocusSince),
    coachStreak: Math.max(0, num(o.coachStreak) ?? 0),
    coachLastRecommendation: parseLastRecommendation(o.coachLastRecommendation),
  };
}

export function parseCoachFieldsFromProfile(raw: unknown): CoachProfileFieldsClient {
  if (!raw || typeof raw !== "object") {
    return parseCoachProfileFields(null);
  }
  const d = raw as Record<string, unknown>;
  return {
    coachFocusArea: d.coachFocusArea ? parseFocusArea(d.coachFocusArea) : null,
    coachFocusSince: num(d.coachFocusSince),
    coachStreak: Math.max(0, num(d.coachStreak) ?? 0),
    coachLastRecommendation: parseLastRecommendation(d.coachLastRecommendation),
  };
}

export function parseAdaptiveCoachPlan(raw: unknown): AdaptiveCoachPlanClient | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const plan = parseCoachPlan(o.plan);
  if (!plan) return null;
  const historyRaw = o.coachHistory;
  const coachHistory =
    Array.isArray(historyRaw) && historyRaw.length > 0
      ? historyRaw
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const h = item as Record<string, unknown>;
            return {
              focusArea: parseFocusArea(h.focusArea),
              target: str(h.target),
              diagnosis: str(h.diagnosis),
              recordedAtMs: num(h.recordedAtMs) ?? 0,
              matchId: str(h.matchId) || undefined,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null)
      : null;
  return {
    plan,
    profileFields: parseCoachProfileFields(o.profileFields),
    matchesPlayed: num(o.matchesPlayed) ?? 0,
    isPro: o.isPro === true,
    maxTrendWindow: num(o.maxTrendWindow) ?? 5,
    coachHistory,
  };
}

export async function callGetAdaptiveCoachPlan(args?: {
  uid?: string;
  window?: number;
}): Promise<AdaptiveCoachPlanClient> {
  const fn = httpsCallable<
    { uid?: string; window?: number },
    { ok: boolean; plan: Record<string, unknown> | null; profileFields: Record<string, unknown> | null; matchesPlayed: number }
  >(functions, "getAdaptiveCoachPlan");

  const res = await fn({
    ...(args?.uid ? { uid: args.uid.trim() } : {}),
    ...(args?.window != null ? { window: args.window } : {}),
  });

  const parsed = parseAdaptiveCoachPlan(res.data);
  if (!parsed) {
    throw new Error("코칭 플랜 데이터가 비어 있습니다.");
  }
  return parsed;
}

export function labelCoachFocusArea(area: CoachFocusAreaClient): string {
  switch (area) {
    case "Passing":
      return "패스";
    case "Control":
      return "볼 컨트롤";
    case "Finishing":
      return "결정력";
    case "Threat Creation":
      return "위협 창출";
    case "Possession":
      return "점유 유지";
    default:
      return "종합";
  }
}

export function labelCoachTrend(trend: CoachTrendStatusClient): string {
  switch (trend) {
    case "improving":
      return "상승";
    case "declining":
      return "하락";
    default:
      return "정체";
  }
}
