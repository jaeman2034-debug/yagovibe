/**
 * Vision v6-6 — Coach ViewModel → Parent Intelligence ViewModel
 */

import { buildParentGrowthNarrative } from "@/lib/ai-growth/parentGrowthNarrativeEngine";
import type { ParentGrowthNarrativeResult } from "@/lib/ai-growth/parentGrowthNarrativeTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { ParentHomeGrowthSummarySlice } from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import {
  buildEmotionSummary,
  pickParentRecommendation,
  translateFiiHeadline,
  translateMatchSummary,
} from "@/lib/vision/coachToParentTranslation";
import {
  buildExplainableFiiBullets,
  explainableFiiTitle,
} from "@/lib/vision/parentExplainableFii";
import type { PlayerIntelligenceView } from "@/lib/vision/playerIntelligenceTypes";
import type { ParentIntelligenceView } from "@/lib/vision/parentIntelligenceTypes";
import type { PeerBenchmarkPayload } from "@/lib/vision/peerBenchmarkFromPlayerFii";

export type BuildParentIntelligenceInput = {
  coachView: PlayerIntelligenceView;
  growthAvatar?: PlayerGrowthAvatarDoc | null;
  growthSnapshot?: ParentHomeGrowthSummarySlice;
  growthNarrative?: ParentGrowthNarrativeResult | null;
  /** VOC-011 — precomputed; null = 미노출 */
  peerBenchmark?: PeerBenchmarkPayload | null;
};

function resolveGrowthNarrative(input: BuildParentIntelligenceInput): ParentGrowthNarrativeResult | null {
  if (input.growthNarrative) return input.growthNarrative;
  const avatar = input.growthAvatar;
  if (!avatar) return null;
  const snapshot: ParentHomeGrowthSummarySlice = input.growthSnapshot ?? { mode: "none" };
  return buildParentGrowthNarrative({
    playerName: input.coachView.summary.playerName,
    avatar,
    growthSnapshot: snapshot,
  });
}

export function buildParentIntelligenceView(
  input: BuildParentIntelligenceInput
): ParentIntelligenceView {
  const { coachView } = input;
  const playerName = coachView.summary.playerName.trim() || "선수";
  const narrative = resolveGrowthNarrative(input);

  const matchSummary = coachView.vision.hasAnalysis
    ? translateMatchSummary(coachView, playerName)
    : null;

  const narrativeParts: string[] = [];
  if (coachView.vision.hasAnalysis) {
    narrativeParts.push(translateFiiHeadline(coachView, playerName));
  } else if (narrative?.summary) {
    narrativeParts.push(narrative.summary.split("\n\n")[0] ?? narrative.summary);
  } else {
    narrativeParts.push(`${playerName} 선수의 성장을 함께 지켜봐 주세요.`);
  }

  if (matchSummary && !narrativeParts[0]?.includes(matchSummary.slice(0, 12))) {
    narrativeParts.push(matchSummary);
  }

  const explainableBullets = buildExplainableFiiBullets({
    axes: coachView.fii.axes,
    isPlaymaker: coachView.playmaker.isPlaymaker,
    tacticalStrengths: coachView.vision.tacticalStrengths,
    growthStrengths: narrative?.strengths ?? [],
    fiiScore: coachView.fii.score,
  });

  const focusArea = narrative?.focusAreas?.[0] ?? null;
  const recommendation = pickParentRecommendation(coachView, focusArea);
  const emotionSummary = buildEmotionSummary(coachView, playerName);

  return {
    summary: {
      playerName,
      teamName: coachView.summary.teamName,
      matchLabel: coachView.summary.matchLabel,
    },
    narrativeSummary: narrativeParts.slice(0, 2).join("\n\n"),
    explainable: {
      title: explainableFiiTitle(coachView.fii.score),
      bullets: explainableBullets,
    },
    emotionSummary,
    recommendation,
    strengths: narrative?.strengths?.slice(0, 3) ?? [],
    matchSummary,
    hasVisionAnalysis: coachView.vision.hasAnalysis,
    peerBenchmark: input.peerBenchmark ?? null,
  };
}
