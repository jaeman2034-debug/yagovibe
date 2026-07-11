/**
 * Brain Wiring — prefer Firestore-persisted fii_summary / coachInsights
 * over vision_result-only dashboard (which omits coachDecisionBrief).
 *
 * Connects existing server fields; does not add new AI features.
 */

import { buildCoachDashboardFromFiiSummary } from "@/lib/vision/fiiSummaryCoachProvider";
import {
  FII_SUMMARY_SCHEMA,
  type FiiSummaryCoachInsights,
  type FiiSummaryDocument,
  type FiiSummaryMatch,
  type FiiSummaryTeam,
} from "@/lib/vision/fiiSummaryTypes";
import { isFiiSummaryDocument } from "@/lib/vision/fiiSummaryLoader";
import type {
  CoachDashboardVisionProviderView,
  VisionAnalysisFirestoreDoc,
} from "@/lib/vision/visionTypes";

type AnalysisLike = VisionAnalysisFirestoreDoc & {
  fiiSummary?: unknown;
  teamFii?: unknown;
  coachInsights?: unknown;
  parentInsights?: unknown;
  summary?: unknown;
  playerFii?: VisionAnalysisFirestoreDoc["playerFii"];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeCoachInsights(raw: unknown): FiiSummaryCoachInsights | null {
  const o = asRecord(raw);
  if (!o) return null;
  const strengths = Array.isArray(o.strengths) ? (o.strengths as string[]) : [];
  const improvementPoints = Array.isArray(o.improvementPoints)
    ? (o.improvementPoints as string[])
    : [];
  const recommendations = Array.isArray(o.recommendations)
    ? (o.recommendations as string[])
    : [];
  if (!o.coachDecisionBrief && strengths.length === 0 && recommendations.length === 0) {
    return null;
  }
  return {
    insightVersion: typeof o.insightVersion === "string" ? o.insightVersion : undefined,
    coachDecisionBrief: o.coachDecisionBrief as FiiSummaryCoachInsights["coachDecisionBrief"],
    reviewHooks: Array.isArray(o.reviewHooks)
      ? (o.reviewHooks as FiiSummaryCoachInsights["reviewHooks"])
      : undefined,
    strengths,
    improvementPoints,
    recommendations,
  };
}

function normalizeTeamFii(raw: unknown): FiiSummaryTeam {
  const o = asRecord(raw);
  return {
    overall: typeof o?.overall === "number" ? o.overall : null,
    axes: (o?.axes as FiiSummaryTeam["axes"]) ?? undefined,
    playerCount: typeof o?.playerCount === "number" ? o.playerCount : undefined,
    ballProgression: (o?.ballProgression as FiiSummaryTeam["ballProgression"]) ?? undefined,
    playmaker: (o?.playmaker as FiiSummaryTeam["playmaker"]) ?? undefined,
  };
}

function normalizeMatchSummary(raw: unknown, tacticalSummary?: string | null): FiiSummaryMatch {
  const o = asRecord(raw);
  const headline =
    (typeof o?.headline === "string" && o.headline.trim()) ||
    "Vision 분석 요약";
  const summary =
    (typeof o?.summary === "string" && o.summary.trim()) ||
    tacticalSummary?.trim() ||
    "GEV·FII 기반 코치 브리프입니다. 최종 적용은 코치님이 결정해 주세요.";
  return {
    headline,
    summary,
    eventHighlights: (o?.eventHighlights as FiiSummaryMatch["eventHighlights"]) ?? undefined,
    possessionChain: (o?.possessionChain as FiiSummaryMatch["possessionChain"]) ?? undefined,
  };
}

/** Rebuild fii_summary contract from Firestore visionAnalysis fields when possible. */
export function tryFiiSummaryFromVisionAnalysis(
  record: AnalysisLike
): FiiSummaryDocument | null {
  if (isFiiSummaryDocument(record.fiiSummary)) {
    return record.fiiSummary;
  }

  const embedded = asRecord(record.fiiSummary);
  if (embedded && isFiiSummaryDocument(embedded)) {
    return embedded as FiiSummaryDocument;
  }

  const coachInsights = normalizeCoachInsights(
    record.coachInsights ?? embedded?.coachInsights
  );
  if (!coachInsights) return null;

  const teamFii = normalizeTeamFii(record.teamFii ?? embedded?.teamFii);

  const players = Array.isArray(record.playerFii) ? record.playerFii : [];
  const playerFii = players.map((p, i) => ({
    trackId: p.trackId ?? p.playerId ?? `P${i + 1}`,
    name: p.name?.trim() || `Player ${p.trackId ?? i + 1}`,
    fii: p.fii,
    rank: p.rank ?? i + 1,
    axes: p.axes,
  }));

  const matchSummary = normalizeMatchSummary(
    record.summary ?? embedded?.matchSummary,
    record.tacticalReport?.summary ?? null
  );

  return {
    schemaVersion: FII_SUMMARY_SCHEMA,
    playerFii,
    teamFii,
    matchSummary,
    coachInsights,
    parentInsights: (record.parentInsights ?? embedded?.parentInsights) as
      | FiiSummaryDocument["parentInsights"]
      | undefined,
    productionPreset:
      typeof embedded?.productionPreset === "string"
        ? embedded.productionPreset
        : undefined,
    fiiMode: typeof embedded?.fiiMode === "string" ? embedded.fiiMode : undefined,
    gevInput: (embedded?.gevInput as FiiSummaryDocument["gevInput"]) ?? undefined,
  };
}

/** Prefer coachDecisionBrief path when Firestore carries fii/coachInsights. */
export function buildCoachDashboardFromVisionAnalysis(
  record: AnalysisLike
): CoachDashboardVisionProviderView | null {
  const doc = tryFiiSummaryFromVisionAnalysis(record);
  if (!doc) return null;
  return buildCoachDashboardFromFiiSummary(doc);
}
