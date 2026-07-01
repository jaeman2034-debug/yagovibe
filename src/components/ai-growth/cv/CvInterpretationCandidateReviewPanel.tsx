/**
 * CV-1 I8-4 — interpretationCandidate Coach Review (Approve / Reject)
 */
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  callReviewInterpretationCandidate,
  parseInterpretationCandidateReviewError,
} from "@/lib/academy/academyCvCallables";
import type {
  InterpretationCandidateReviewDecision,
  InterpretationCandidateReviewStatus,
  InterpretationCandidateSnapshotDto,
} from "@/lib/academy/academyCvInterpretationReadTypes";
import { formatCvProcessedAt } from "@/components/ai-growth/cv/cvRunUiHelpers";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string;
  candidate: InterpretationCandidateSnapshotDto;
  onReviewed?: () => void;
};

function reviewLabel(status: InterpretationCandidateReviewStatus | undefined): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "candidate":
    default:
      return "Candidate";
  }
}

function reviewBadgeClass(status: InterpretationCandidateReviewStatus | undefined): string {
  switch (status) {
    case "approved":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-900";
    case "candidate":
    default:
      return "border-amber-300 bg-amber-50 text-amber-950";
  }
}

export function CvInterpretationCandidateReviewPanel({
  teamId,
  mediaId,
  linkId,
  candidate,
  onReviewed,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState(
    candidate.reviewStatus ?? "candidate"
  );
  const [reviewedBy, setReviewedBy] = useState(candidate.reviewedBy);
  const [reviewedAt, setReviewedAt] = useState(candidate.reviewedAt);
  const [coachNote, setCoachNote] = useState(candidate.coachNote ?? "");
  const [noteDraft, setNoteDraft] = useState("");

  const isCandidate = reviewStatus === "candidate";

  async function submit(decision: InterpretationCandidateReviewDecision) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await callReviewInterpretationCandidate({
        teamId,
        mediaId,
        linkId,
        candidateId: candidate.candidateId,
        decision,
        coachNote: noteDraft.trim() || undefined,
      });
      setReviewStatus(result.reviewStatus);
      setReviewedBy(result.reviewedBy);
      setReviewedAt(result.reviewedAt);
      setCoachNote(result.coachNote ?? "");
      onReviewed?.();
    } catch (e) {
      const parsed = parseInterpretationCandidateReviewError(e);
      if (parsed.message.includes("already-reviewed")) {
        setError("이미 검토된 interpretation candidate입니다.");
      } else {
        setError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 rounded-md border border-violet-200 bg-violet-50/50 px-2 py-1.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-900">
        <ShieldCheck className="h-3 w-3" />
        Coach Review (I8-4)
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
            reviewBadgeClass(reviewStatus)
          )}
        >
          {reviewLabel(reviewStatus)}
        </span>
        {!isCandidate ? (
          <span className="text-[10px] text-gray-600">
            {reviewedBy?.slice(0, 8)}… · {formatCvProcessedAt(reviewedAt)}
          </span>
        ) : null}
      </div>
      {!isCandidate && coachNote ? (
        <p className="mt-1 text-[10px] text-gray-700">Note: {coachNote}</p>
      ) : null}
      {isCandidate ? (
        <>
          <textarea
            className="mt-2 w-full rounded border border-violet-200 bg-white px-2 py-1 text-[11px]"
            rows={2}
            placeholder="코치 메모 (선택)"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              className="h-7 bg-emerald-600 text-[10px] hover:bg-emerald-700"
              onClick={() => void submit("approved")}
            >
              {submitting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              )}
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={submitting}
              className="h-7 border-red-300 text-[10px] text-red-800 hover:bg-red-50"
              onClick={() => void submit("rejected")}
            >
              {submitting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              Reject
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-1 text-[10px] text-gray-600">재검토 불가 (review lock).</p>
      )}
      {error ? (
        <p className="mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
