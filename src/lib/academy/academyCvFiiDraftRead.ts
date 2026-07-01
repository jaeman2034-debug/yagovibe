/**
 * CV-1 I9-3 — fiiDraft FII preview (Callable only)
 */
import {
  callGetCvFiiDraftCompareContext,
  callGetCvFiiDraftPreviewContext,
} from "@/lib/academy/academyCvCallables";
import type {
  FiiDraftCompareResultDto,
  FiiDraftSnapshotDto,
} from "@/lib/academy/academyCvFiiDraftReadTypes";

export type CvFiiDraftPreviewContext = {
  linkId: string | null;
  promotionRuleVersion: string;
  fiiEngineVersion: string;
  drafts: FiiDraftSnapshotDto[];
};

export async function loadCvFiiDraftPreviewContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvFiiDraftPreviewContext> {
  const res = await callGetCvFiiDraftPreviewContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    promotionRuleVersion: res.promotionRuleVersion,
    fiiEngineVersion: res.fiiEngineVersion,
    drafts: res.drafts,
  };
}

export type CvFiiDraftCompareContext = {
  linkId: string | null;
  promotionRuleVersion: string;
  fiiEngineVersion: string;
  compare: FiiDraftCompareResultDto | null;
};

export async function loadCvFiiDraftCompareContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvFiiDraftCompareContext> {
  const res = await callGetCvFiiDraftCompareContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    promotionRuleVersion: res.promotionRuleVersion,
    fiiEngineVersion: res.fiiEngineVersion,
    compare: res.compare,
  };
}
