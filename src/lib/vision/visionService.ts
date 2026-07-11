/**
 * Vision v6-3 — analyze vision_result for Coach / Parent providers
 */

import { loadVisionResult, normalizeVisionResult } from "@/lib/vision/visionLoader";
import type {
  CoachVisionSummary,
  PlayerFii,
  VisionResult,
  VisionResultJson,
} from "@/lib/vision/visionTypes";

function compactnessScore(result: VisionResult): number | null {
  const c = result.teamCompactness;
  if (!c) return null;
  if (c.unit === "percent" || c.score > 1) {
    return Math.round(c.score * 10) / 10;
  }
  return Math.round(c.score * 1000) / 10;
}

function bestPressureZoneLabel(result: VisionResult): string | null {
  const pz = result.pressureZone;
  if (!pz?.zones?.length) return null;
  const bestId = pz.bestZoneId ?? pz.dominantZoneId;
  if (bestId) {
    const z = pz.zones.find((x) => x.zoneId === bestId);
    return z?.label ?? z?.zoneId ?? bestId;
  }
  const top = [...pz.zones].sort((a, b) => b.intensity - a.intensity)[0];
  return top?.label ?? top?.zoneId ?? null;
}

function buildRecommendation(result: VisionResult): string {
  const parts: string[] = [];
  const pm = result.playmaker?.name;
  if (pm) {
    parts.push(`${pm} 선수의 키 패스 연결을 다음 훈련에서 강화하세요.`);
  }
  const fwd = result.ballProgression?.forwardPassRate;
  if (fwd != null && fwd < 0.35) {
    parts.push("전방 패스 비율이 낮습니다. 전진 패스 인식 훈련을 권장합니다.");
  } else if (fwd != null && fwd >= 0.5) {
    parts.push("전방 패스 비율이 양호합니다. 현재 빌드업 패턴을 유지하세요.");
  }
  const compact = compactnessScore(result);
  if (compact != null && compact < 50) {
    parts.push("팀 간격이 넓습니다. 압축 수비·공격 시 밀집도 훈련을 추가하세요.");
  }
  if (result.tacticalReport?.recommendations?.length) {
    parts.push(result.tacticalReport.recommendations[0]!);
  }
  if (parts.length === 0 && result.tacticalReport?.summary) {
    return result.tacticalReport.summary;
  }
  return parts.join(" ") || "Vision 분석 결과를 바탕으로 다음 세션 전술을 조정하세요.";
}

/** Dashboard-ready coach summary from normalized VisionResult */
export function analyzeVisionResultFromData(result: VisionResult): CoachVisionSummary {
  return {
    playmaker: result.playmaker,
    compactness: compactnessScore(result),
    forwardPassRate: result.ballProgression?.forwardPassRate ?? null,
    bestPressureZone: bestPressureZoneLabel(result),
    playerRanking: result.playerFii,
    recommendation: buildRecommendation(result),
  };
}

/** Load JSON (path) or use in-memory result → coach summary */
export async function analyzeVisionResult(
  input: string | VisionResult | VisionResultJson
): Promise<CoachVisionSummary> {
  if (typeof input === "string") {
    const loaded = await loadVisionResult(input);
    return analyzeVisionResultFromData(loaded);
  }
  const normalized =
    "playerFii" in input && Array.isArray(input.playerFii)
      ? (input as VisionResult)
      : normalizeVisionResult(input as VisionResultJson);
  return analyzeVisionResultFromData(normalized);
}

export function findPlayerFii(
  result: VisionResult,
  opts: { playerId?: string; trackId?: string }
): PlayerFii | null {
  const { playerId, trackId } = opts;
  if (playerId) {
    const hit = result.playerFii.find((p) => p.playerId === playerId);
    if (hit) return hit;
  }
  if (trackId) {
    const hit = result.playerFii.find((p) => p.trackId === trackId);
    if (hit) return hit;
  }
  return null;
}
