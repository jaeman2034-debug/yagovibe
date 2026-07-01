/**
 * CV-1 I11-3-1 — avatarPromotionPreview (Callable only)
 */
import {
  callGetCvAvatarPromotionPreviewCompareContext,
  callGetCvAvatarPromotionPreviewContext,
} from "@/lib/academy/academyCvCallables";
import type {
  AvatarPromotionPreviewCompareResultDto,
  AvatarPromotionPreviewSnapshotDto,
} from "@/lib/academy/academyCvAvatarPromotionPreviewReadTypes";

export type CvAvatarPromotionPreviewContext = {
  linkId: string | null;
  promotionRuleVersion: string;
  previews: AvatarPromotionPreviewSnapshotDto[];
};

export async function loadCvAvatarPromotionPreviewContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvAvatarPromotionPreviewContext> {
  const res = await callGetCvAvatarPromotionPreviewContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    promotionRuleVersion: res.promotionRuleVersion,
    previews: res.previews,
  };
}

export type CvAvatarPromotionPreviewCompareContext = {
  linkId: string | null;
  promotionRuleVersion: string;
  compare: AvatarPromotionPreviewCompareResultDto | null;
};

export async function loadCvAvatarPromotionPreviewCompareContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvAvatarPromotionPreviewCompareContext> {
  const res = await callGetCvAvatarPromotionPreviewCompareContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    promotionRuleVersion: res.promotionRuleVersion,
    compare: res.compare,
  };
}
