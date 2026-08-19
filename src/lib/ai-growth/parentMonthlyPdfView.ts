/**
 * J1-3a — Parent Home Monthly PDF view (read-only · I12/J1-1 projection composite · no new SoT)
 */
import { canShowGrowthTimelineChart } from "@/lib/ai-growth/growthTimelineDisplay";
import { buildParentAvatarSurfaceView } from "@/lib/ai-growth/parentAvatarSurfaceView";
import { buildParentGrowthNarrative } from "@/lib/ai-growth/parentGrowthNarrativeEngine";
import { buildParentGrowthTimelineView } from "@/lib/ai-growth/parentGrowthTimelineView";
import type {
  ParentHomeGrowthSummarySlice,
  ParentHomeWeeklyDigestSlice,
} from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import { buildParentWeeklyGrowthDigestView } from "@/lib/ai-growth/parentWeeklyGrowthDigestView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";

export const PARENT_MONTHLY_PDF_EMPTY_MESSAGE =
  "코치 검증 훈련 기록 2회 이상 쌓이면 월간 성장 리포트 PDF를 받을 수 있습니다." as const;

export const PARENT_MONTHLY_PDF_EXPORT_BLOCKED_MESSAGE = PARENT_MONTHLY_PDF_EMPTY_MESSAGE;

export type ParentMonthlyPdfView = {
  periodLabel: string;
  summaryLine: string | null;
  ovrLine: string | null;
  avatarLine: string | null;
  trendLine: string | null;
  strengthLine: string | null;
  nextGoalLine: string | null;
  canExport: boolean;
  isEmpty: boolean;
  emptyMessage: string;
};

export type ParentMonthlyPdfViewInput = {
  playerName?: string;
  avatar: PlayerGrowthAvatarDoc;
  growthSummary: ParentHomeGrowthSummarySlice;
  timeline: PlayerGrowthTimeline | null;
  weeklyDigest: ParentHomeWeeklyDigestSlice | null;
};

function currentMonthPeriodLabel(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

function resolveOvrLine(input: ParentMonthlyPdfViewInput): string | null {
  const digestView = buildParentWeeklyGrowthDigestView({
    playerName: input.playerName,
    avatar: input.avatar,
    growthSummary: input.growthSummary,
    timeline: input.timeline,
    weeklyDigest: input.weeklyDigest,
  });
  if (digestView.ovrHeadline) return digestView.ovrHeadline;

  if (input.growthSummary.mode === "comparison") {
    const { previousOverall, currentOverall, delta } = input.growthSummary.summary;
    const d = delta.delta ?? 0;
    const suffix = d !== 0 ? ` (${d > 0 ? "+" : ""}${d})` : "";
    return `OVR ${previousOverall} → ${currentOverall}${suffix}`;
  }

  if (input.growthSummary.mode === "first_record") {
    return `OVR ${input.growthSummary.currentOverall}`;
  }

  return input.avatar.ovr ? `OVR ${input.avatar.ovr}` : null;
}

function resolveTrendLine(
  timeline: PlayerGrowthTimeline | null,
  avatar: PlayerGrowthAvatarDoc
): string | null {
  const view = buildParentGrowthTimelineView({ timeline, avatar });
  if (!view.canShowChart) return null;
  return `최근 추세 ${view.trendLabelKo} · ${view.ovrChain}`;
}

function resolveNextGoalLine(input: ParentMonthlyPdfViewInput): string | null {
  const digestView = buildParentWeeklyGrowthDigestView({
    playerName: input.playerName,
    avatar: input.avatar,
    growthSummary: input.growthSummary,
    timeline: input.timeline,
    weeklyDigest: input.weeklyDigest,
  });
  return digestView.nextGoalLine;
}

export function canParentExportMonthlyPdf(input: {
  growthSummary: ParentHomeGrowthSummarySlice;
  timeline: PlayerGrowthTimeline | null;
}): boolean {
  return (
    canShowGrowthTimelineChart(input.timeline) || input.growthSummary.mode === "comparison"
  );
}

export function buildParentMonthlyPdfView(input: ParentMonthlyPdfViewInput): ParentMonthlyPdfView {
  const surface = buildParentAvatarSurfaceView(input.avatar);
  const narrative = buildParentGrowthNarrative({
    playerName: input.playerName,
    avatar: input.avatar,
    growthSnapshot: input.growthSummary,
  });
  const canExport = canParentExportMonthlyPdf({
    growthSummary: input.growthSummary,
    timeline: input.timeline,
  });
  const sessionCount = input.avatar.sessionCount ?? 0;

  const summaryLine =
    sessionCount > 0
      ? `${currentMonthPeriodLabel()} · 검증 훈련 ${sessionCount}회 기준`
      : `${currentMonthPeriodLabel()} · 월간 성장 요약`;

  const avatarLine = `Lv.${surface.level} ${surface.levelLabel} · ${surface.tierEmoji} ${surface.tierLabelKo} · OVR ${surface.ovr}`;

  const strengthLine = narrative.strengths[0] ?? null;
  const trendLine = resolveTrendLine(input.timeline, input.avatar);
  const ovrLine = resolveOvrLine(input);
  const nextGoalLine = resolveNextGoalLine(input);

  return {
    periodLabel: currentMonthPeriodLabel(),
    summaryLine,
    ovrLine,
    avatarLine,
    trendLine,
    strengthLine,
    nextGoalLine,
    canExport,
    isEmpty: !canExport,
    emptyMessage: PARENT_MONTHLY_PDF_EMPTY_MESSAGE,
  };
}