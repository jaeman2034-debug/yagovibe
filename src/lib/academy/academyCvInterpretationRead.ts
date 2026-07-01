/**
 * CV-1 I8-3 — interpretationCandidates read (Callable only)
 */
import { callGetCvInterpretationPreviewContext } from "@/lib/academy/academyCvCallables";
import type { InterpretationCandidateSnapshotDto } from "@/lib/academy/academyCvInterpretationReadTypes";

export type CvInterpretationPreviewContext = {
  linkId: string | null;
  reviewStatus: string | null;
  candidates: InterpretationCandidateSnapshotDto[];
};

export async function loadCvInterpretationPreviewContext(
  teamId: string,
  mediaId: string,
  linkId?: string
): Promise<CvInterpretationPreviewContext> {
  const res = await callGetCvInterpretationPreviewContext({ teamId, mediaId, linkId });
  return {
    linkId: res.linkId,
    reviewStatus: res.reviewStatus,
    candidates: res.candidates,
  };
}
