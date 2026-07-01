/**
 * CV-1 I11-1 — avatarDraft preview (Callable only)
 */
import {
  callGetCvAvatarDraftPreviewContext,
  callGetCvAvatarDraftCompareContext,
} from "@/lib/academy/academyCvCallables";
import type {
  AvatarDraftSnapshotDto,
  AvatarDraftCompareResultDto,
} from "@/lib/academy/academyCvAvatarDraftReadTypes";

export type CvAvatarDraftPreviewContext = {
  linkId: string | null;
  avatarRuleVersion: string;
  playerId: string | null;
  drafts: AvatarDraftSnapshotDto[];
};

export async function loadCvAvatarDraftPreviewContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvAvatarDraftPreviewContext> {
  const res = await callGetCvAvatarDraftPreviewContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    avatarRuleVersion: res.avatarRuleVersion,
    playerId: res.playerId,
    drafts: res.drafts,
  };
}

export type CvAvatarDraftCompareContext = {
  linkId: string | null;
  avatarRuleVersion: string;
  compare: AvatarDraftCompareResultDto | null;
};

export async function loadCvAvatarDraftCompareContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvAvatarDraftCompareContext> {
  const res = await callGetCvAvatarDraftCompareContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    avatarRuleVersion: res.avatarRuleVersion,
    compare: res.compare,
  };
}
