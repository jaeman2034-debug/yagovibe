/**
 * CV-1 I9-2 — growthSignal draft Coach Validation (Validate / Reject)
 */
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  callReviewGrowthSignalDraft,
  parseGrowthSignalDraftReviewError,
} from "@/lib/academy/academyCvCallables";
import type {
  GrowthSignalSnapshotDto,
  GrowthSignalValidationDecisionDto,
  GrowthSignalValidationStatusDto,
} from "@/lib/academy/academyCvGrowthSignalsReadTypes";
import { formatCvProcessedAt } from "@/components/ai-growth/cv/cvRunUiHelpers";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string;
  signal: GrowthSignalSnapshotDto;
  onReviewed?: () => void;
};

function validationLabel(status: GrowthSignalValidationStatusDto): string {
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

function validationBadgeClass(status: GrowthSignalValidationStatusDto): string {
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

export function CvGrowthSignalValidationPanel({
  teamId,
  mediaId,
  linkId,
  signal,
  onReviewed,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState(
    signal.validationStatus ?? "pending"
  );
  const [validatedBy, setValidatedBy] = useState(signal.validatedBy);
  const [validatedAt, setValidatedAt] = useState(signal.validatedAt);
  const [coachNote, setCoachNote] = useState(signal.coachNote ?? "");
  const [noteDraft, setNoteDraft] = useState("");

  const isPending = validationStatus === "pending";

  async function submit(decision: GrowthSignalValidationDecisionDto) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await callReviewGrowthSignalDraft({
        teamId,
        mediaId,
        linkId,
        signalId: signal.signalId,
        decision,
        coachNote: noteDraft.trim() || undefined,
      });
      setValidationStatus(result.validationStatus);
      setValidatedBy(result.validatedBy);
      setValidatedAt(result.validatedAt);
      setCoachNote(result.coachNote ?? "");
      onReviewed?.();
    } catch (e) {
      const parsed = parseGrowthSignalDraftReviewError(e);
      if (parsed.message.includes("already-reviewed")) {
        setError("이미 검토된 growth signal draft입니다.");
      } else {
        setError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-2 rounded-md border border-teal-200 bg-teal-50/50 px-2 py-1.5">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-teal-900">
        <ShieldCheck className="h-3 w-3" />
        Coach Validation (I9-2)
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
            className="mt-2 w-full rounded border border-teal-200 bg-white px-2 py-1 text-[11px]"
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
