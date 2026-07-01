/**
 * CV-1 I10-1 — ovrDraft preview (Callable only)
 */
import {
  callGetCvOvrDraftCompareContext,
  callGetCvOvrDraftPreviewContext,
} from "@/lib/academy/academyCvCallables";
import type {
  OvrDraftCompareResultDto,
  OvrDraftSnapshotDto,
} from "@/lib/academy/academyCvOvrDraftReadTypes";

export type CvOvrDraftPreviewContext = {
  linkId: string | null;
  ovrRuleVersion: string;
  fiiEngineVersion: string;
  promotionRuleVersion: string;
  drafts: OvrDraftSnapshotDto[];
};

export async function loadCvOvrDraftPreviewContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvOvrDraftPreviewContext> {
  const res = await callGetCvOvrDraftPreviewContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    ovrRuleVersion: res.ovrRuleVersion,
    fiiEngineVersion: res.fiiEngineVersion,
    promotionRuleVersion: res.promotionRuleVersion,
    drafts: res.drafts,
  };
}

export type CvOvrDraftCompareContext = {
  linkId: string | null;
  ovrRuleVersion: string;
  fiiEngineVersion: string;
  promotionRuleVersion: string;
  compare: OvrDraftCompareResultDto | null;
};

export async function loadCvOvrDraftCompareContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvOvrDraftCompareContext> {
  const res = await callGetCvOvrDraftCompareContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    ovrRuleVersion: res.ovrRuleVersion,
    fiiEngineVersion: res.fiiEngineVersion,
    promotionRuleVersion: res.promotionRuleVersion,
    compare: res.compare,
  };
}
