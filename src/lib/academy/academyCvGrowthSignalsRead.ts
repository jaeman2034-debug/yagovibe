/**
 * CV-1 I9-1 — growthSignals simulation preview (Callable only)
 */
import { callGetCvGrowthSignalsPreviewContext } from "@/lib/academy/academyCvCallables";
import type { GrowthSignalSnapshotDto } from "@/lib/academy/academyCvGrowthSignalsReadTypes";

export type CvGrowthSignalsPreviewContext = {
  linkId: string | null;
  mappingRuleVersion: string;
  signals: GrowthSignalSnapshotDto[];
};

export async function loadCvGrowthSignalsPreviewContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvGrowthSignalsPreviewContext> {
  const res = await callGetCvGrowthSignalsPreviewContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    mappingRuleVersion: res.mappingRuleVersion,
    signals: res.signals,
  };
}
