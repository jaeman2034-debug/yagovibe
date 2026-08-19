/**
 * GEV v1 — Transcript Rule 기반 15종 태깅 (CV 미포함)
 */
import type { GrowthConfidence, MockGrowthEvent, TranscriptSegment } from "@/components/ai-growth/types";
import {
  GEV_V1_KEYWORD_RULES,
  gevV1ToLegacyCore,
  type GevV1EventKey,
} from "@/lib/gev/gevV1Events";

export function tagGevV1EventsHeuristic(segments: TranscriptSegment[]): MockGrowthEvent[] {
  const out: MockGrowthEvent[] = [];
  const usedKeys = new Set<string>();

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    for (const rule of GEV_V1_KEYWORD_RULES) {
      const dedupeKey = `${rule.key}:${segment.id}`;
      if (usedKeys.has(dedupeKey)) continue;
      const matched = rule.patterns.some((re) => re.test(text));
      if (!matched) continue;

      const gevV1Key = rule.key;
      const legacyCore = gevV1ToLegacyCore(gevV1Key);
      out.push({
        id: `gev-${out.length + 1}`,
        eventType: legacyCore,
        gevV1Key,
        timestampStart: segment.start,
        timestampEnd: segment.end,
        transcriptStart: segment.start,
        transcriptEnd: segment.end,
        evidence: text,
        confidence: inferConfidence(text, gevV1Key),
        reviewStatus: "candidate",
        guardianPhrase: rule.guardianPhrase,
      });
      usedKeys.add(dedupeKey);
      break;
    }
  }

  return out;
}

function inferConfidence(text: string, key: GevV1EventKey): GrowthConfidence {
  const explicit = GEV_V1_KEYWORD_RULES.find((r) => r.key === key)?.patterns.some((re) =>
    re.test(text)
  );
  if (!explicit) return "LOW";
  if (/좋|잘|훌|nice|good|great/i.test(text)) return "HIGH";
  return "MEDIUM";
}
