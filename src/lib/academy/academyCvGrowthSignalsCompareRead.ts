/**
 * CV-1 I9-2 — growthSignals compare (Callable only)
 */
import { callGetCvGrowthSignalsCompareContext } from "@/lib/academy/academyCvCallables";
import type { GrowthSignalCompareResultDto } from "@/lib/academy/academyCvGrowthSignalsReadTypes";

export type CvGrowthSignalsCompareContext = {
  linkId: string | null;
  mappingRuleVersion: string;
  compare: GrowthSignalCompareResultDto | null;
};

export async function loadCvGrowthSignalsCompareContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvGrowthSignalsCompareContext> {
  const res = await callGetCvGrowthSignalsCompareContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    mappingRuleVersion: res.mappingRuleVersion,
    compare: res.compare,
  };
}
