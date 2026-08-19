import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type {
  MetricTrendClient,
  PlayerArchetypesClient,
  PlayerTrendIntelligenceClient,
  PlayerTrendsClient,
  TrendDirectionClient,
} from "./playerTrendTypes";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseDirection(v: unknown): TrendDirectionClient {
  if (v === "up" || v === "down" || v === "stable") return v;
  return "stable";
}

function parseMetricTrend(raw: unknown): MetricTrendClient {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const values = Array.isArray(o.values)
    ? o.values.map((x) => num(x) ?? 0).filter((x) => Number.isFinite(x))
    : [];
  return {
    values,
    avg: num(o.avg) ?? 0,
    delta: num(o.delta) ?? 0,
    direction: parseDirection(o.direction),
  };
}

function parseTrends(raw: unknown): PlayerTrendsClient | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (num(t.version) !== 1) return null;
  const momentumRaw = t.momentum;
  const m =
    momentumRaw && typeof momentumRaw === "object"
      ? (momentumRaw as Record<string, unknown>)
      : {};
  return {
    version: 1,
    window: num(t.window) ?? 5,
    snapshotCount: num(t.snapshotCount) ?? 0,
    overall: parseMetricTrend(t.overall),
    xThreat: parseMetricTrend(t.xThreat),
    finishing: parseMetricTrend(t.finishing),
    control: parseMetricTrend(t.control),
    passing: parseMetricTrend(t.passing),
    momentum: {
      label: str(m.label) || "Stable",
      score: num(m.score) ?? 50,
      direction: parseDirection(m.direction),
    },
  };
}

function parseArchetypes(raw: unknown): PlayerArchetypesClient | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  if (num(a.version) !== 1) return null;
  return {
    version: 1,
    primary: str(a.primary) || "Engine",
    secondary: str(a.secondary) || null,
    badges: Array.isArray(a.badges) ? a.badges.filter((b): b is string => typeof b === "string") : [],
    explain: Array.isArray(a.explain) ? a.explain.filter((e): e is string => typeof e === "string") : [],
  };
}

export function parsePlayerTrendIntelligence(raw: unknown): PlayerTrendIntelligenceClient | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const trends = parseTrends(s.trends);
  const archetypes = parseArchetypes(s.archetypes);
  if (!trends || !archetypes) return null;
  return {
    uid: str(s.uid),
    window: num(s.window) ?? 5,
    trends,
    archetypes,
    profileMatchesPlayed: num(s.profileMatchesPlayed) ?? 0,
    isPro: s.isPro === true,
    maxTrendWindow: num(s.maxTrendWindow) ?? 5,
  };
}

export async function callGetPlayerTrendIntelligence(args?: {
  uid?: string;
  window?: number;
}): Promise<PlayerTrendIntelligenceClient> {
  const fn = httpsCallable<
    { uid?: string; window?: number },
    { ok: boolean; summary: Record<string, unknown> | null }
  >(functions, "getPlayerTrendIntelligence");

  const res = await fn({
    ...(args?.uid ? { uid: args.uid.trim() } : {}),
    ...(args?.window != null ? { window: args.window } : {}),
  });

  const parsed = parsePlayerTrendIntelligence(res.data?.summary);
  if (!parsed) {
    throw new Error("트렌드 인텔리전스 데이터가 비어 있습니다.");
  }
  return parsed;
}
