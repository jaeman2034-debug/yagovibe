import type { MockGrowthEvent } from "@/components/ai-growth/types";

type CoachReviewContextForNarrative = {
  action: "confirmed" | "rejected" | "edited";
  evidence: string;
  coachNote?: string;
  videoTimestamp: number;
};

type VerifiedItemForNarrative = {
  event: MockGrowthEvent;
  context: CoachReviewContextForNarrative;
};

/** 행동 → 의미 → 훈련 제안 (학부모 리포트 3단 구조) */
export type GuardianEventReportBlock = {
  eventId: string;
  eventType: string;
  labelKo: string;
  atLabel: string;
  seekSeconds: number;
  behavior: string;
  meaning: string;
  training: string;
};

type EventCopy = {
  labelKo: string;
  behaviorIntro: string;
  behaviorObserved: (playerName: string, atLabel: string | null, evidence: string) => string;
  meaning: string;
  training: string;
  timelineLine: (atLabel: string) => string;
};

const EVENT_COPY: Record<string, EventCopy> = {
  SCAN: {
    labelKo: "① 공을 받기 전 주변 확인",
    behaviorIntro: "공을 받기 전에 주변 상황을 먼저 확인하려는",
    behaviorObserved: (name, at, evidence) => {
      const base = `${name} 선수는 공을 받기 전 주변을 확인하는 행동이 관찰되었습니다.`;
      const scene = at ? `특히 ${at} 장면에서도 같은 모습이 확인되었습니다.` : "";
      const quote = evidence.trim() ? ` (코치 발화: “${evidence.trim()}”)` : "";
      return [base, scene, quote].filter(Boolean).join(" ");
    },
    meaning:
      "이는 패스를 받기 전에 다음 플레이를 준비하는 과정으로, 경기 속도가 빨라질수록 더욱 중요한 습관입니다.",
    training:
      "다음 훈련에서는 패스 전 좌우 확인 후 첫 터치 방향 결정 연습을 반복보면 좋겠습니다.",
    timelineLine: (at) => `${at} · 공 받기 전 주변 확인`,
  },
  PRESS_RESIST: {
    labelKo: "② 압박 속 침착함",
    behaviorIntro: "압박 상황에서도 공을 지키거나 팀으로 연결하려는",
    behaviorObserved: (name, at, evidence) => {
      const base = `${name} 선수는 압박 상황에서도 서두르지 않고 볼을 유지하려는 모습이 확인되었습니다.`;
      const scene = at ? `특히 ${at} 장면에서 몸으로 공간을 지키거나 바로 연결하는 플레이가 보였습니다.` : "";
      const quote = evidence.trim() ? ` (코치 발화: “${evidence.trim()}”)` : "";
      return [base, scene, quote].filter(Boolean).join(" ");
    },
    meaning:
      "이러한 행동은 상대 압박을 벗겨내고 팀의 공격 전개를 안정적으로 이어가는 데 도움이 됩니다.",
    training:
      "다음 훈련에서는 등지는 자세와 첫 터치 방향 전환을 집중적으로 연습보면 좋겠습니다.",
    timelineLine: (at) => `${at} · 압박 속 공 지키기/연결`,
  },
  QUICK_RECOVERY: {
    labelKo: "③ 빠른 재집중",
    behaviorIntro: "실수 직후에도 바로 다음 수비·플레이에 몰입하려는",
    behaviorObserved: (name, at, evidence) => {
      const base = `${name} 선수는 볼을 잃은 직후 빠르게 수비 전환하는 장면이 관찰되었습니다.`;
      const scene = at
        ? `특히 ${at} 장면에서 실수 이후 바로 압박·복귀하는 모습이 확인되었습니다.`
        : "";
      const quote = evidence.trim() ? ` (코치 발화: “${evidence.trim()}”)` : "";
      return [base, scene, quote].filter(Boolean).join(" ");
    },
    meaning:
      "즉시 압박과 복귀는 실점 가능성을 줄이는 중요한 경기 지능 요소입니다.",
    training:
      "다음 훈련에서는 볼을 잃은 뒤 3초 안에 압박하는 습관을 강화보면 좋겠습니다.",
    timelineLine: (at) => `${at} · 실수 후 바로 재집중`,
  },
};

const GENERIC_GUARDIAN_PHRASE =
  /응원해\s*주세요|잘\s*할\s*수\s*있도록|화이팅|힘내세요|열심히\s*하면|꼭\s*될\s*거|멋진\s*모습|자랑스러운/i;

export function isGenericGuardianPhrase(phrase: string | undefined | null): boolean {
  const t = phrase?.trim() ?? "";
  if (!t || t.length < 8) return true;
  return GENERIC_GUARDIAN_PHRASE.test(t);
}

export function formatAtLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) {
    return `${m}분${s > 0 ? `${s}초` : ""}`;
  }
  return `${s}초`;
}

export function seekSecondsForItem(event: MockGrowthEvent, context: CoachReviewContextForNarrative): number {
  return context.videoTimestamp > 0 ? context.videoTimestamp : event.transcriptStart;
}

export function getEventCopy(eventType: string): EventCopy {
  return (
    EVENT_COPY[eventType] ?? {
      labelKo: eventType,
      behaviorIntro: "코치가 확인한 긍정적인 플레이 태도가",
      behaviorObserved: (name, at, evidence) => {
        const base = `${name} 선수는 코치가 확인한 긍정적인 플레이 태도가 관찰되었습니다.`;
        const scene = at ? `특히 ${at} 장면이 대표적입니다.` : "";
        const quote = evidence.trim() ? ` (코치 발화: “${evidence.trim()}”)` : "";
        return [base, scene, quote].filter(Boolean).join(" ");
      },
      meaning: "코치가 영상으로 검증한 장면은 아이의 성장 과정을 구체적으로 이해하는 데 도움이 됩니다.",
      training: "다음 훈련에서는 같은 장면을 짧게 복습하며 코치가 강조한 포인트를 반복보면 좋겠습니다.",
      timelineLine: (at) => `${at} · 코치 검증 장면`,
    }
  );
}

export function buildEventReportBlock(
  playerName: string,
  event: MockGrowthEvent,
  context: CoachReviewContextForNarrative,
  options?: { includeSceneTime?: boolean }
): GuardianEventReportBlock {
  const copy = getEventCopy(event.eventType);
  const seekSeconds = seekSecondsForItem(event, context);
  const atLabel = formatAtLabel(seekSeconds);
  const atForBehavior = options?.includeSceneTime !== false ? atLabel : null;

  let training = copy.training;
  if (context.coachNote?.trim()) {
    training = `${copy.training} (코치 메모: ${context.coachNote.trim()})`;
  }

  return {
    eventId: event.id,
    eventType: event.eventType,
    labelKo: copy.labelKo,
    atLabel,
    seekSeconds,
    behavior: copy.behaviorObserved(playerName, atForBehavior, context.evidence),
    meaning: copy.meaning,
    training,
  };
}

export function buildEventReportBlocks(
  playerName: string,
  items: VerifiedItemForNarrative[]
): GuardianEventReportBlock[] {
  const includeSceneTime = items.length > 1;
  return items.map(({ event, context }) =>
    buildEventReportBlock(playerName, event, context, { includeSceneTime })
  );
}

/** Evidence 카드 주장 — 행동 문장 */
export function resolveGuardianClaim(
  event: MockGrowthEvent,
  context: CoachReviewContextForNarrative,
  playerName = "선수"
): string {
  if (!isGenericGuardianPhrase(event.guardianPhrase)) {
    return event.guardianPhrase.trim();
  }
  const block = buildEventReportBlock(playerName, event, context);
  return block.behavior.replace(/\s*\(코치 발화:.*\)\s*$/, "");
}

export function buildSessionBehaviorOpening(
  playerName: string,
  counts: Map<string, number>
): string {
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return `${playerName} 선수의 이번 세션 영상에서 코치 검증된 성장 장면을 정리했습니다.`;
  }
  if (entries.length === 1) {
    const [type, n] = entries[0]!;
    const copy = getEventCopy(type);
    const repeat = n > 1 ? ` 같은 모습이 ${n}번` : "";
    return `${playerName} 선수는 이번 영상에서 ${copy.behaviorIntro} 행동${repeat} 관찰되었습니다.`;
  }
  const parts = entries.map(([type, n]) => `${getEventCopy(type).labelKo} ${n}회`);
  return `${playerName} 선수는 이번 영상에서 ${parts.join(", ")} 등 코치가 확인한 성장 신호가 관찰되었습니다.`;
}

export function buildVerifiedCountLine(counts: Map<string, number>): string {
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "";
  if (entries.length === 1) {
    const [type, n] = entries[0]!;
    return `이번 세션에서 ${getEventCopy(type).labelKo} 행동이 ${n}회 확인되었습니다.`;
  }
  return `이번 세션에서 ${entries.map(([t, n]) => `${getEventCopy(t).labelKo} ${n}회`).join(", ")} 확인되었습니다.`;
}

/** @deprecated — 3단 블록 사용 권장 */
export function buildSceneParagraphs(items: VerifiedItemForNarrative[], max = 3): string[] {
  return buildEventReportBlocks("선수", items.slice(0, max)).map((b) => b.behavior);
}

/** @deprecated — 3단 블록 사용 권장 */
export function buildWhyItMattersParagraph(counts: Map<string, number>): string {
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!top) return "";
  return getEventCopy(top).meaning;
}

export function buildTimelineLine(
  event: MockGrowthEvent,
  context: CoachReviewContextForNarrative
): string {
  const copy = getEventCopy(event.eventType);
  const at = formatAtLabel(seekSecondsForItem(event, context));
  return copy.timelineLine(at);
}

/** 리포트 본문 — 블록을 평문 배열로 펼침 (레거시 body 호환) */
export function flattenReportBlocks(blocks: GuardianEventReportBlock[]): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    out.push(`【${block.labelKo}】 ${block.atLabel}`);
    out.push(`무엇을 잘했는가: ${block.behavior}`);
    out.push(`왜 중요한가: ${block.meaning}`);
    out.push(`다음 훈련: ${block.training}`);
  }
  return out;
}
