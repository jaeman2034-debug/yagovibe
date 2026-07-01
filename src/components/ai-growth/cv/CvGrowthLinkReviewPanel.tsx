/**
 * CV-1 I7 J6 — cvGrowthLinks Manual Review (Accept / Reject)
 */
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  callReviewCvGrowthLink,
  parseCvGrowthLinkReviewError,
} from "@/lib/academy/academyCvCallables";
import type {
  CvGrowthLinkReviewDecision,
  CvGrowthLinkReviewStatus,
  CvGrowthLinkSnapshotDto,
} from "@/lib/academy/academyCvGrowthLinksTypes";
import { formatCvProcessedAt } from "@/components/ai-growth/cv/cvRunUiHelpers";

type Props = {
  teamId: string;
  mediaId: string;
  link: CvGrowthLinkSnapshotDto;
  disabled?: boolean;
  onReviewed?: () => void;
};

function reviewStatusLabel(status: CvGrowthLinkReviewStatus | undefined): string {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "candidate":
    default:
      return "Candidate";
  }
}

function reviewStatusBadgeClass(status: CvGrowthLinkReviewStatus | undefined): string {
  switch (status) {
    case "accepted":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-900";
    case "candidate":
    default:
      return "border-amber-300 bg-amber-50 text-amber-950";
  }
}

export function CvGrowthLinkReviewPanel({
  teamId,
  mediaId,
  link,
  disabled,
  onReviewed,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState(link.reviewStatus ?? "candidate");
  const [reviewedBy, setReviewedBy] = useState(link.reviewedBy);
  const [reviewedAt, setReviewedAt] = useState(link.reviewedAt);

  useEffect(() => {
    setReviewStatus(link.reviewStatus ?? "candidate");
    setReviewedBy(link.reviewedBy);
    setReviewedAt(link.reviewedAt);
    setError(null);
  }, [link.linkId, link.reviewStatus, link.reviewedBy, link.reviewedAt]);

  const isCandidate = reviewStatus === "candidate";

  async function submit(decision: CvGrowthLinkReviewDecision) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await callReviewCvGrowthLink({
        teamId,
        mediaId,
        linkId: link.linkId,
        decision,
      });
      setReviewStatus(result.reviewStatus);
      setReviewedBy(result.reviewedBy);
      setReviewedAt(result.reviewedAt);
      onReviewed?.();
    } catch (e) {
      const parsed = parseCvGrowthLinkReviewError(e);
      if (parsed.message.includes("already-reviewed")) {
        setError("이미 검토된 growth link입니다.");
      } else {
        setError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/40 px-3 py-2 text-xs text-gray-900">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-900">
        <ShieldCheck className="h-3.5 w-3.5" />
        CV Growth Link Review (J6)
      </p>
      <p className="mt-1 font-mono text-[10px] text-teal-800">
        linkId: {link.linkId.slice(0, 12)}… · cvRun: {link.cvRunId.slice(0, 10)}…
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
            reviewStatusBadgeClass(reviewStatus)
          )}
        >
          {reviewStatusLabel(reviewStatus)}
        </span>
        {!isCandidate ? (
          <span className="text-[10px] text-gray-600">
            {reviewedBy?.slice(0, 8)}… · {formatCvProcessedAt(reviewedAt)}
          </span>
        ) : null}
      </div>

      {isCandidate ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled || submitting}
            className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700"
            onClick={() => void submit("accepted")}
          >
            {submitting ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            )}
            Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || submitting}
            className="h-8 border-red-300 text-xs text-red-800 hover:bg-red-50"
            onClick={() => void submit("rejected")}
          >
            {submitting ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="mr-1 h-3.5 w-3.5" />
            )}
            Reject
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-[10px] text-gray-600">재검토 불가 (review lock).</p>
      )}

      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-800">
          {error}
        </p>
      ) : null}

      <p className="mt-2 text-[10px] text-gray-500">
        FII · OVR · Avatar · Parent · Growth Mapping 금지 (J6 LOCK).
      </p>
    </div>
  );
}
