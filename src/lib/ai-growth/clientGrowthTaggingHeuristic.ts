import type {
  CanonicalGrowthEventKey,
  GrowthConfidence,
  MockGrowthEvent,
  TranscriptSegment,
} from "@/components/ai-growth/types";
import { isGevV1_15Enabled } from "@/lib/fii/fiiFeatureFlags";
import { tagGevV1EventsHeuristic } from "@/lib/gev/gevV1TaggingHeuristic";

const GUARDIAN_PHRASE_DEFAULTS: Record<CanonicalGrowthEventKey, string> = {
  SCAN: "공을 받기 전 주변을 확인하는 모습이 점점 자연스러워지고 있어요.",
  PRESS_RESIST: "상대가 붙어도 침착하게 공을 지키거나 팀으로 연결하는 모습이 좋아요.",
  QUICK_RECOVERY: "실수 후에도 바로 다음 플레이에 집중하는 모습이 성장하고 있어요.",
};

/** Prod / mobile fallback when Growth tagging CF is unavailable (validation-only). */
export function tagGrowthEventsHeuristic(segments: TranscriptSegment[]): MockGrowthEvent[] {
  if (isGevV1_15Enabled()) {
    return tagGevV1EventsHeuristic(segments);
  }

  const rules: Array<{ key: CanonicalGrowthEventKey; re: RegExp; confidence: GrowthConfidence }> = [
    { key: "SCAN", re: /주변|look around|scan|헤드업|둘러/i, confidence: "MEDIUM" },
    { key: "PRESS_RESIST", re: /압박|press|버텼|shield|몸싸움|연결/i, confidence: "MEDIUM" },
    { key: "QUICK_RECOVERY", re: /리커버리|recovery|따라가|실수|다시|재집중/i, confidence: "HIGH" },
  ];

  const out: MockGrowthEvent[] = [];
  for (const segment of segments) {
    for (const rule of rules) {
      if (!rule.re.test(segment.text)) continue;
      out.push({
        id: `tag-${out.length + 1}`,
        eventType: rule.key,
        timestampStart: segment.start,
        timestampEnd: segment.end,
        transcriptStart: segment.start,
        transcriptEnd: segment.end,
        evidence: segment.text,
        confidence: rule.confidence,
        reviewStatus: "candidate",
        guardianPhrase: GUARDIAN_PHRASE_DEFAULTS[rule.key],
      });
      break;
    }
  }
  return out;
}
