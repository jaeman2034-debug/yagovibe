/**
 * CV-1 I10-3-2-1 — promotionPreview Coach Validation (Validate / Reject)
 */
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  callReviewPromotionPreview,
  parsePromotionPreviewReviewError,
} from "@/lib/academy/academyCvCallables";
import type {
  PromotionPreviewSnapshotDto,
  PromotionPreviewValidationDecisionDto,
  PromotionPreviewValidationStatusDto,
} from "@/lib/academy/academyCvPromotionPreviewReadTypes";
import { formatCvProcessedAt } from "@/components/ai-growth/cv/cvRunUiHelpers";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string;
  preview: PromotionPreviewSnapshotDto;
  onReviewed?: () => void;
};

function validationLabel(status: PromotionPreviewValidationStatusDto): string {
  switch (status) {
    case "validated":
      return "Validated";
    case "rejected":
      return "Rejected";
    case "pending":
    default:
      return "Pending";
  }
}

function validationBadgeClass(status: PromotionPreviewValidationStatusDto): string {
  switch (status) {
    case "validated":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-900";
    case "pending":
    default:
      return "border-amber-300 bg-amber-50 text-amber-950";
  }
}

export function CvPromotionValidationPanel({
  teamId,
  mediaId,
  linkId,
  preview,
  onReviewed,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState(
    preview.validationStatus ?? "pending"
  );
  const [validatedBy, setValidatedBy] = useState(preview.validatedBy);
  const [validatedAt, setValidatedAt] = useState(preview.validatedAt);
  const [coachNote, setCoachNote] = useState(preview.coachNote ?? "");
  const [noteDraft, setNoteDraft] = useState("");

  const isPending = validationStatus === "pending";

  async function submit(decision: PromotionPreviewValidationDecisionDto) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await callReviewPromotionPreview({
        teamId,
        mediaId,
        linkId,
        previewId: preview.previewId,
        decision,
        coachNote: noteDraft.trim() || undefined,
      });
      setValidationStatus(result.validationStatus);
      setValidatedBy(result.validatedBy);
      setValidatedAt(result.validatedAt);
      setCoachNote(result.coachNote ?? "");
      onReviewed?.();
    } catch (e) {
      const parsed = parsePromotionPreviewReviewError(e);
      if (parsed.message.includes("already-reviewed")) {
        setError("이미 검토된 promotion preview입니다.");
      } else {
        setError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mt-2 rounded-md border border-indigo-300 bg-indigo-50/60 px-2 py-1.5"
      data-testid="cv-promotion-validation-panel"
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-indigo-900">
        <ShieldCheck className="h-3 w-3" />
        Coach Validation (I10-3-2-1)
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
            validationBadgeClass(validationStatus)
          )}
        >
          {validationLabel(validationStatus)}
        </span>
        {!isPending ? (
          <span className="text-[10px] text-gray-600">
            {validatedBy?.slice(0, 8)}… · {formatCvProcessedAt(validatedAt)}
          </span>
        ) : null}
      </div>
      {!isPending && coachNote ? (
        <p className="mt-1 text-[10px] text-gray-700">Note: {coachNote}</p>
      ) : null}
      {isPending ? (
        <>
          <textarea
            className="mt-2 w-full rounded border border-indigo-200 bg-white px-2 py-1 text-[11px]"
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
              onClick={() => void submit("validated")}
            >
              {submitting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              )}
              Validate
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
        <p className="mt-1 text-[10px] text-gray-600">재검토 불가 (validation lock).</p>
      )}
      {error ? (
        <p className="mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
