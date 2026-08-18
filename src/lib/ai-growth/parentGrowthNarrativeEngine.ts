/**
 * CV-1 I12-2 — playerGrowthAvatar + latest growth snapshot → guardian-friendly narrative
 */
import { buildParentAvatarSurfaceView } from "@/lib/ai-growth/parentAvatarSurfaceView";
import type {
  ParentGrowthNarrativeInput,
  ParentGrowthNarrativeResult,
} from "@/lib/ai-growth/parentGrowthNarrativeTypes";
import type { ParentHomeGrowthSummarySlice } from "@/lib/ai-growth/parentHomeGrowthCardV2Types";

const STAT_STRONG = 85;
const STAT_WEAK = 80;

function displayName(input: ParentGrowthNarrativeInput): string {
  return input.playerName?.trim() || input.avatar.playerName?.trim() || "선수";
}

/** Parent Home "최근 변화" 섹션용 (read-only projection) */
export function buildParentGrowthRecentChangeLine(
  growthSnapshot: ParentHomeGrowthSummarySlice,
  weeklyDeltaOvr: number | null | undefined
): string | null {
  if (growthSnapshot.mode === "comparison") {
    const { previousOverall, currentOverall, delta } = growthSnapshot.summary;
    const d = delta.delta ?? 0;
    if (d > 0) {
      return `최근 훈련에서 성장 점수가 ${previousOverall}점에서 ${currentOverall}점으로 올랐습니다.`;
    }
    if (d < 0) {
      return `최근 훈련에서 성장 점수가 ${previousOverall}점에서 ${currentOverall}점으로 소폭 조정되었습니다.`;
    }
    return `최근 훈련에서 성장 점수 ${currentOverall}점을 안정적으로 유지하고 있습니다.`;
  }

  if (growthSnapshot.mode === "first_record") {
    return "첫 훈련 기록이 저장되어, 앞으로 성장 변화를 비교할 수 있습니다.";
  }

  if (weeklyDeltaOvr != null && weeklyDeltaOvr > 0) {
    return "이번 주 종합 능력치가 소폭 상승했습니다.";
  }
  if (weeklyDeltaOvr != null && weeklyDeltaOvr < 0) {
    return "이번 주 종합 능력치가 소폭 하락했습니다. 꾸준한 훈련으로 회복할 수 있습니다.";
  }

  return null;
}

function buildStrengthLines(vision: number, pressure: number, recovery: number): string[] {
  const lines: string[] = [];

  if (vision >= STAT_STRONG) {
    lines.push("최근 훈련에서 시야 확보 능력이 안정적으로 유지되고 있습니다.");
  }
  if (pressure >= STAT_STRONG) {
    lines.push("압박을 받는 상황에서도 침착하게 플레이하는 장면이 반복적으로 관찰되었습니다.");
  }
  if (recovery >= STAT_STRONG) {
    lines.push("실수 후 빠르게 다시 집중하는 모습이 안정적입니다.");
  }

  return lines.slice(0, 3);
}

function buildFocusLines(vision: number, pressure: number, recovery: number): string[] {
  const lines: string[] = [];

  if (recovery < STAT_WEAK) {
    lines.push("실수 후 빠르게 다시 집중하는 연습을 늘리면 도움이 됩니다.");
  }
  if (vision < STAT_WEAK) {
    lines.push("주변 상황을 살피는 훈련을 보강하면 좋습니다.");
  }
  if (pressure < STAT_WEAK) {
    lines.push("압박 상황에서 볼을 지키는 훈련을 이어가면 좋습니다.");
  }

  if (lines.length === 0 && recovery < STAT_STRONG) {
    lines.push("회복·재집중 훈련을 조금 더 늘리면 균형 잡힌 성장에 도움이 됩니다.");
  }

  return lines.slice(0, 3);
}

function buildSummaryParagraphs(input: ParentGrowthNarrativeInput): string[] {
  const { avatar } = input;
  const surface = buildParentAvatarSurfaceView(avatar);
  const name = displayName(input);
  const paragraphs: string[] = [];

  const axisStrengths = buildStrengthLines(avatar.vision, avatar.pressure, avatar.recovery);
  if (axisStrengths.length > 0) {
    paragraphs.push(axisStrengths[0]!);
    if (axisStrengths.length > 1) {
      paragraphs.push(axisStrengths[1]!);
    }
  } else {
    paragraphs.push(`${name} 선수의 최근 훈련 데이터를 바탕으로 성장을 추적하고 있습니다.`);
  }

  paragraphs.push(
    `현재 ${surface.tierLabelKo} 티어(${surface.levelLabel})를 유지하고 있습니다.`
  );

  if (surface.topBadgeLabelsKo.length > 0) {
    paragraphs.push(
      `${surface.topBadgeLabelsKo.slice(0, 2).join(", ")} 등의 강점이 눈에 띕니다.`
    );
  }

  return paragraphs.slice(0, 3);
}

/** I12-2 — guardian-friendly narrative (read-only) */
export function buildParentGrowthNarrative(
  input: ParentGrowthNarrativeInput
): ParentGrowthNarrativeResult {
  const { avatar } = input;
  const surface = buildParentAvatarSurfaceView(avatar);
  const summaryParts = buildSummaryParagraphs(input);

  const strengths = buildStrengthLines(avatar.vision, avatar.pressure, avatar.recovery);
  if (strengths.length === 0 && surface.topBadgeLabelsKo.length > 0) {
    strengths.push(`${surface.topBadgeLabelsKo[0]} 강점이 돋보입니다.`);
  }

  const focusAreas = buildFocusLines(avatar.vision, avatar.pressure, avatar.recovery);

  return {
    summary: summaryParts.join("\n\n"),
    strengths,
    focusAreas,
  };
}

/** Empty-state guard for Parent Home narrative panel */
export function isParentGrowthNarrativeEmpty(input: ParentGrowthNarrativeInput): boolean {
  const sessions = input.avatar.sessionCount ?? 0;
  return sessions <= 0 && input.growthSnapshot.mode === "none";
}
