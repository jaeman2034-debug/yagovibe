import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { buildAvatarGrowthRecommendations } from "@/lib/ai-growth/avatarGrowthRecommendationEngine";
import type { AvatarGrowthRecommendation } from "@/lib/ai-growth/avatarGrowthRecommendationTypes";
import type { GrowthAiSummaryResult } from "@/lib/ai-growth/growthAiSummaryTypes";
import { analyzeGrowthRisks } from "@/lib/ai-growth/growthRiskDetectionEngine";
import type { GrowthRiskSignal } from "@/lib/ai-growth/growthRiskTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { WeeklyGrowthDigestEnrichment } from "@/lib/ai-growth/weeklyDigestTypes";
import { buildWeeklyGrowthDigestEnrichment } from "@/lib/ai-growth/weeklyGrowthDigestEngine";

export type GrowthAiSummaryInput = {
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
  weeklyGrowth?: WeeklyGrowthDigestEnrichment | null;
  attendanceRatePct?: number | null;
  risks?: GrowthRiskSignal[];
  recommendations?: AvatarGrowthRecommendation[];
};

const STAT_STRONG_THRESHOLD = 85;
const STAT_WEAK_THRESHOLD = 80;

function displayName(input: GrowthAiSummaryInput): string {
  return input.playerName.trim() || input.avatar.playerName || "선수";
}

function resolveRisksAndRecs(input: GrowthAiSummaryInput): {
  risks: GrowthRiskSignal[];
  recommendations: AvatarGrowthRecommendation[];
} {
  if (input.risks && input.recommendations) {
    return { risks: input.risks, recommendations: input.recommendations };
  }
  const analysis = analyzeGrowthRisks({
    avatar: input.avatar,
    timeline: input.timeline,
    attendanceRatePct: input.attendanceRatePct ?? null,
  });
  return {
    risks: input.risks ?? analysis.risks,
    recommendations: input.recommendations ?? analysis.recommendations,
  };
}

function buildCoachSections(
  avatar: PlayerGrowthAvatarDoc,
  risks: GrowthRiskSignal[],
  recommendations: AvatarGrowthRecommendation[]
): GrowthAiSummaryResult["coach"] {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (avatar.vision >= STAT_STRONG_THRESHOLD) {
    strengths.push(`Vision ${avatar.vision} — 시야 우수`);
  } else if (avatar.vision < STAT_WEAK_THRESHOLD) {
    weaknesses.push(`Vision ${avatar.vision} — 시야 보완 필요`);
  }

  if (avatar.pressure >= STAT_STRONG_THRESHOLD) {
    strengths.push(`Pressure ${avatar.pressure} — 압박 대응 우수`);
  } else if (avatar.pressure < STAT_WEAK_THRESHOLD) {
    weaknesses.push(`Pressure ${avatar.pressure} — 압박 대응 보완 필요`);
  }

  if (avatar.recovery >= STAT_STRONG_THRESHOLD) {
    strengths.push(`Recovery ${avatar.recovery} — 회복 우수`);
  } else {
    weaknesses.push(`Recovery ${avatar.recovery} — 회복 집중 관리`);
  }

  if (avatar.badges.length > 0) {
    const labels = avatar.badges.slice(0, 3).map((id) => badgeMetaById(id).labelKo);
    strengths.push(`보유 배지: ${labels.join(", ")}`);
  }

  const risksLines = risks.map((r) => `${r.title} — ${r.body}`);
  const recommendedTraining = recommendations
    .filter((r) => r.kind === "training_focus" || r.kind === "badge")
    .slice(0, 3)
    .map((r) => (r.kind === "training_focus" ? r.detail : `${r.title}: ${r.detail.split("\n")[0]}`));

  return {
    strengths,
    weaknesses,
    risks: risksLines,
    recommendedTraining,
  };
}

/** Sprint D-5.5-a — Parent-facing AI 성장 요약 (template · SoT engines) */
export function buildParentGrowthAiSummary(input: GrowthAiSummaryInput): GrowthAiSummaryResult {
  const name = displayName(input);
  const { avatar, timeline } = input;
  const { risks, recommendations } = resolveRisksAndRecs(input);
  const recBundle =
    recommendations.length > 0
      ? { recommendations }
      : buildAvatarGrowthRecommendations(avatar, 5);

  const paragraphs: string[] = [];

  paragraphs.push(
    `${name} 선수는 현재 Level ${avatar.level}(OVR ${avatar.ovr})로 성장 추적 중입니다.`
  );

  const strongStats: string[] = [];
  if (avatar.vision >= STAT_STRONG_THRESHOLD) strongStats.push(`Vision(${avatar.vision})`);
  if (avatar.pressure >= STAT_STRONG_THRESHOLD) strongStats.push(`Pressure(${avatar.pressure})`);

  if (strongStats.length >= 1) {
    let line = `${strongStats.join("과 ")} 능력은 우수한 수준을 유지하고 있습니다.`;
    const notableBadges = avatar.badges
      .map((id) => badgeMetaById(id).labelKo)
      .filter(Boolean)
      .slice(0, 2);
    if (notableBadges.length > 0) {
      line = `${strongStats.join("과 ")} 능력은 우수한 수준을 유지하고 있으며, ${notableBadges.join(", ")} 배지를 보유하고 있습니다.`;
    }
    paragraphs.push(line);
  }

  const delta = avatar.weeklyDeltaOvr;
  if (delta != null && delta < 0) {
    const before = avatar.ovr - delta;
    paragraphs.push(
      `최근 훈련에서는 OVR이 ${before} → ${avatar.ovr}로 소폭 하락했습니다.`
    );
  } else if (delta != null && delta > 0) {
    const before = avatar.ovr - delta;
    paragraphs.push(`최근 훈련에서는 OVR이 ${before} → ${avatar.ovr}로 상승했습니다.`);
  } else if (timeline?.deltaScore != null && timeline.deltaScore !== 0) {
    const sign = timeline.deltaScore > 0 ? "상승" : "하락";
    paragraphs.push(`최근 세션 성장 점수가 ${sign} 추세입니다.`);
  }

  if (avatar.recovery < STAT_WEAK_THRESHOLD) {
    paragraphs.push(
      `Recovery(${avatar.recovery})는 상대적으로 낮아 회복 훈련 비중 확대가 권장됩니다.`
    );
  }

  const goalLines: string[] = [];
  for (const rec of recBundle.recommendations) {
    if (rec.kind === "badge" && rec.stat === "recovery") {
      goalLines.push(`Recovery 80 달성 시 ${rec.title}`);
    } else if (rec.kind === "level") {
      goalLines.push(`OVR 90 달성 시 Level 5`);
    }
  }
  if (goalLines.length === 0) {
    const levelRec = recBundle.recommendations.find((r) => r.kind === "level");
    if (levelRec) goalLines.push(`OVR 90 달성 시 Level 5`);
  }
  const uniqueGoals = [...new Set(goalLines)].slice(0, 2);
  if (uniqueGoals.length > 0) {
    paragraphs.push(`${uniqueGoals.join(", ")} 달성이 가능합니다.`);
  }

  const coach = buildCoachSections(avatar, risks, recBundle.recommendations);

  return {
    paragraphs,
    fullText: paragraphs.join("\n\n"),
    coach,
  };
}

/** Coach Step5 · PDF 공용 입력 빌더 */
export function buildGrowthAiSummaryFromAvatar(input: {
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
  timeline: PlayerGrowthTimeline | null;
  attendanceRatePct?: number | null;
}): GrowthAiSummaryResult {
  const weeklyGrowth = buildWeeklyGrowthDigestEnrichment({
    avatar: input.avatar,
    timeline: input.timeline,
    digestSummary: {
      scoreCurrent: input.avatar.ovr,
      scorePrevious: null,
      delta: input.avatar.weeklyDeltaOvr ?? null,
    },
    weekStartMs: Date.now() - 7 * 24 * 60 * 60 * 1000,
    weekEndMs: Date.now(),
  });

  return buildParentGrowthAiSummary({
    ...input,
    weeklyGrowth,
  });
}
