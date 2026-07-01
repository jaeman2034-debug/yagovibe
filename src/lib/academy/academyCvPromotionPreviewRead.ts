/**
 * CV-1 I10-3-1 — promotionPreview (Callable only)
 */
import {
  callGetCvPromotionPreviewCompareContext,
  callGetCvPromotionPreviewContext,
} from "@/lib/academy/academyCvCallables";
import type {
  PromotionPreviewCompareResultDto,
  PromotionPreviewSnapshotDto,
} from "@/lib/academy/academyCvPromotionPreviewReadTypes";

export type CvPromotionPreviewContext = {
  linkId: string | null;
  promotionRuleVersion: string;
  previews: PromotionPreviewSnapshotDto[];
};

export async function loadCvPromotionPreviewContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvPromotionPreviewContext> {
  const res = await callGetCvPromotionPreviewContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    promotionRuleVersion: res.promotionRuleVersion,
    previews: res.previews,
  };
}

export type CvPromotionPreviewCompareContext = {
  linkId: string | null;
  promotionRuleVersion: string;
  compare: PromotionPreviewCompareResultDto | null;
};

export async function loadCvPromotionPreviewCompareContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvPromotionPreviewCompareContext> {
  const res = await callGetCvPromotionPreviewCompareContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    promotionRuleVersion: res.promotionRuleVersion,
    compare: res.compare,
  };
}
