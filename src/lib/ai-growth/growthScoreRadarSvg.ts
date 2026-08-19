import { computeGrowthProfileRadar } from "@/lib/ai-growth/growthProfileRadar";
import { buildGrowthProfileRadarSvg } from "@/lib/ai-growth/growthProfileRadarSvg";
import type { GrowthScoreResult } from "@/lib/ai-growth/growthScore";

/** PDF·인쇄용 — Sprint 8B-3 5축 성장 프로파일 레이더 */
export function buildGrowthScoreRadarSvg(gs: GrowthScoreResult): string {
  return buildGrowthProfileRadarSvg(computeGrowthProfileRadar(gs));
}
