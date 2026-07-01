import type { MockGrowthEvent } from "@/components/ai-growth/types";
import {
  buildEventReportBlocks,
  buildSessionBehaviorOpening,
  buildTimelineLine,
  buildVerifiedCountLine,
  resolveGuardianClaim,
  seekSecondsForItem,
  type GuardianEventReportBlock,
} from "@/components/ai-growth/guardianReportCopy";

export type { GuardianEventReportBlock } from "@/components/ai-growth/guardianReportCopy";

export type ReportTone = "reassurance" | "growth" | "technical";

export type CoachReviewContextForNarrative = {
  action: "confirmed" | "rejected" | "edited";
  eventId: string;
  eventType: string;
  eventTimestampStart: number;
  eventTimestampEnd: number;
  evidence: string;
  transcript: string;
  confidence: MockGrowthEvent["confidence"];
  coachNote?: string;
  videoTimestamp: number;
};

export type VerifiedItemForNarrative = {
  event: MockGrowthEvent;
  context: CoachReviewContextForNarrative;
};

export type GuardianNarrativeEventLine = {
  eventId: string;
  eventType: string;
  seekSeconds: number;
  line: string;
};

export type GuardianNarrativeResult = {
  tone: ReportTone;
  headline: string;
  opening: string;
  body: string[];
  /** 행동 → 의미 → 훈련 제안 (UI 구조화용) */
  eventBlocks: GuardianEventReportBlock[];
  eventLines: GuardianNarrativeEventLine[];
  footer: string;
};

const TONE_LABELS: Record<ReportTone, string> = {
  reassurance: "안심형",
  growth: "성장형",
  technical: "기술형",
};

export function reportToneLabel(tone: ReportTone): string {
  return TONE_LABELS[tone];
}

export function generateGuardianNarrative(input: {
  playerName: string;
  tone: ReportTone;
  verifiedItems: VerifiedItemForNarrative[];
}): GuardianNarrativeResult {
  const { playerName, tone, verifiedItems } = input;
  const name = playerName.trim() || "선수";

  if (verifiedItems.length === 0) {
    return {
      tone,
      headline: `${name} 학부모 성장 리포트`,
      opening: "코치가 영상으로 검증한 성장 이벤트가 아직 없습니다. Step4에서 이벤트를 승인한 뒤 다시 확인해주세요.",
      body: [],
      eventBlocks: [],
      eventLines: [],
      footer: "AI 제안은 참고용이며, 최종 판단은 코치가 수행합니다.",
    };
  }

  const counts = countEventTypes(verifiedItems);
  const eventBlocks = buildEventReportBlocks(name, verifiedItems);
  const eventLines = verifiedItems.map(({ event, context }) => ({
    eventId: event.id,
    eventType: event.eventType,
    seekSeconds: seekSecondsForItem(event, context),
    line: buildEventLine(tone, name, event, context),
  }));

  if (tone === "reassurance") {
    return buildReassuranceNarrative(name, verifiedItems, counts, eventBlocks, eventLines);
  }
  if (tone === "growth") {
    return buildGrowthNarrative(name, verifiedItems, counts, eventBlocks, eventLines);
  }
  return buildTechnicalNarrative(name, verifiedItems, counts, eventBlocks, eventLines);
}

function buildReassuranceNarrative(
  name: string,
  items: VerifiedItemForNarrative[],
  counts: Map<string, number>,
  eventBlocks: GuardianEventReportBlock[],
  eventLines: GuardianNarrativeEventLine[]
): GuardianNarrativeResult {
  const countLine = buildVerifiedCountLine(counts);

  const body: string[] = [
    "이 리포트는 AI 추측이 아니라, 코치가 영상으로 확인·승인한 성장 장면만 담았습니다. 점수나 순위가 아닌 ‘오늘의 태도’에 초점을 맞춥니다.",
    ...(countLine ? [countLine] : []),
    "아래 각 장면마다 무엇을 잘했는지, 왜 중요한지, 다음 훈련에서 무엇을 연습하면 좋은지를 정리했습니다.",
  ];

  return {
    tone: "reassurance",
    headline: `${name} 학부모 성장 리포트`,
    opening: `${buildSessionBehaviorOpening(name, counts)} (코치 영상 검증 ${items.length}건)`,
    body,
    eventBlocks,
    eventLines,
    footer:
      "YAGO는 AI 분석 → 코치 검증 → 학부모 이해 → 성장 추적까지 이어지는 리포트입니다. 타임스탬프를 누르면 해당 장면으로 이동합니다.",
  };
}

function buildGrowthNarrative(
  name: string,
  items: VerifiedItemForNarrative[],
  counts: Map<string, number>,
  eventBlocks: GuardianEventReportBlock[],
  eventLines: GuardianNarrativeEventLine[]
): GuardianNarrativeResult {
  const countLine = buildVerifiedCountLine(counts);

  const body: string[] = [
    countLine || `검증된 성장 장면 ${items.length}건이 이번 코칭 리포트에 반영되었습니다.`,
    "각 장면별로 행동·의미·다음 훈련 제안을 확인하고, 팀 훈련 계획에 연결해보세요.",
  ];

  return {
    tone: "growth",
    headline: `${name} 성장 코칭 리포트`,
    opening: buildSessionBehaviorOpening(name, counts),
    body,
    eventBlocks,
    eventLines,
    footer: "코치 검증 완료 · 장면별 타임스탬프로 복습 루프를 만들 수 있습니다.",
  };
}

function buildTechnicalNarrative(
  name: string,
  items: VerifiedItemForNarrative[],
  counts: Map<string, number>,
  eventBlocks: GuardianEventReportBlock[],
  eventLines: GuardianNarrativeEventLine[]
): GuardianNarrativeResult {
  const freq = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${type} ${n}회`)
    .join(" · ");

  const avgRecoveryWindow =
    items
      .filter((i) => i.event.eventType === "QUICK_RECOVERY")
      .map((i) => i.context.eventTimestampEnd - i.context.eventTimestampStart)
      .reduce((sum, v, _, arr) => sum + v / arr.length, 0) || null;

  return {
    tone: "technical",
    headline: `${name} 전술·행동 분석 리포트`,
    opening: `코치 검증 이벤트 ${items.length}건 기준 tactical review입니다. verified evidence만 사용합니다.`,
    body: [
      `이벤트 빈도: ${freq || "N/A"}.`,
      avgRecoveryWindow
        ? `QUICK_RECOVERY 평균 구간 길이 약 ${avgRecoveryWindow.toFixed(1)}초.`
        : "QUICK_RECOVERY 구간은 이번 세션에서 제한적입니다.",
      "장면별 3단 구조(행동·의미·훈련)는 아래 카드와 타임라인을 참고하세요.",
    ],
    eventBlocks,
    eventLines,
    footer: "(코치 검증 완료) · 엘리트/디렉터 리뷰용 technical digest",
  };
}

function buildEventLine(
  tone: ReportTone,
  playerName: string,
  event: MockGrowthEvent,
  context: CoachReviewContextForNarrative
): string {
  if (tone === "technical") {
    const verified =
      context.action === "edited" ? "Coach Edited & Verified" : "Coach Confirmed";
    return `${buildTimelineLine(event, context)} · AI ${context.confidence} · ${verified}`;
  }
  const block = buildEventReportBlocks(playerName, [{ event, context }])[0]!;
  return `${buildTimelineLine(event, context)} — ${block.behavior.slice(0, 72)}${block.behavior.length > 72 ? "…" : ""}`;
}

function countEventTypes(items: VerifiedItemForNarrative[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { event } of items) {
    counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  }
  return counts;
}
