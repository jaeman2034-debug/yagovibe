/**
 * CV-1 I11-3-2-1 — avatarPromotionPreview Coach Validation
 * CV-1 I11-3-2-2 — Validation UI Polish (labels · read-only styling)
 */
import { CheckCircle2, Loader2, Lock, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  callReviewAvatarPromotionPreview,
  parseAvatarPromotionPreviewReviewError,
} from "@/lib/academy/academyCvCallables";
import type {
  AvatarPromotionPreviewSnapshotDto,
  AvatarPromotionPreviewValidationDecisionDto,
  AvatarPromotionPreviewValidationStatusDto,
} from "@/lib/academy/academyCvAvatarPromotionPreviewReadTypes";
import { formatCvProcessedAt } from "@/components/ai-growth/cv/cvRunUiHelpers";
import {
  avatarPromotionReviewedAtLabel,
  avatarPromotionReviewerLabel,
  avatarPromotionValidationBadgeClass,
  avatarPromotionValidationBadgeLabel,
} from "@/components/ai-growth/cv/cvAvatarPromotionValidationUi";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string;
  preview: AvatarPromotionPreviewSnapshotDto;
  onReviewed?: () => void;
};

export function CvAvatarPromotionValidationPanel({
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
  const isReviewed = validationStatus === "validated" || validationStatus === "rejected";

  async function submit(decision: AvatarPromotionPreviewValidationDecisionDto) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await callReviewAvatarPromotionPreview({
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
      const parsed = parseAvatarPromotionPreviewReviewError(e);
      if (parsed.message.includes("already-reviewed")) {
        setError("이미 검토된 Avatar promotion preview입니다.");
      } else {
        setError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function renderReviewMeta(status: Exclude<AvatarPromotionPreviewValidationStatusDto, "pending">) {
    return (
      <div
        className={cn(
          "mt-2 rounded border px-2 py-1.5 text-[10px]",
          status === "validated"
            ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
            : "border-red-200 bg-red-50/80 text-red-950"
        )}
        data-testid="cv-avatar-promotion-validation-reviewed-meta"
      >
        <p>
          <span className="font-semibold">{avatarPromotionReviewerLabel(status)}</span>{" "}
          <span className="font-mono">{validatedBy?.slice(0, 8)}…</span>
        </p>
        <p className="mt-0.5 text-gray-700">
          <span className="font-semibold">{avatarPromotionReviewedAtLabel(status)}</span>{" "}
          {formatCvProcessedAt(validatedAt)}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-2 rounded-md border px-2 py-1.5",
        isReviewed
          ? "border-slate-300 bg-slate-50/90"
          : "border-teal-300 bg-teal-50/60"
      )}
      data-testid="cv-avatar-promotion-validation-panel"
      data-validation-status={validationStatus}
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-teal-900">
        <ShieldCheck className="h-3 w-3" />
        Coach Validation (I11-3-2-1)
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            avatarPromotionValidationBadgeClass(validationStatus)
          )}
          data-testid="cv-avatar-promotion-validation-badge"
        >
          {avatarPromotionValidationBadgeLabel(validationStatus)}
        </span>
      </div>

      {isReviewed ? (
        <>
          {renderReviewMeta(validationStatus)}
          {coachNote ? (
            <div
              className="mt-2 rounded border border-slate-200 bg-white/90 px-2 py-1.5 text-[10px] text-gray-800"
              data-testid="cv-avatar-promotion-validation-coach-note-readonly"
            >
              <p className="font-semibold text-gray-600">코치 메모</p>
              <p className="mt-0.5 whitespace-pre-wrap">{coachNote}</p>
            </div>
          ) : null}
          <p
            className="mt-2 flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] text-slate-600"
            data-testid="cv-avatar-promotion-validation-lock"
          >
            <Lock className="h-3 w-3 shrink-0" />
            재검토 불가 (already-reviewed lock)
          </p>
        </>
      ) : (
        <>
          <textarea
            className="mt-2 w-full rounded border border-teal-200 bg-white px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:bg-slate-50"
            rows={2}
            placeholder="코치 메모 (선택)"
            value={noteDraft}
            disabled={submitting}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              className="h-7 bg-emerald-600 text-[10px] hover:bg-emerald-700 disabled:opacity-50"
              data-testid="cv-avatar-promotion-validation-approve"
              onClick={() => void submit("validated")}
            >
              {submitting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              )}
              승인
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={submitting}
              className="h-7 border-red-300 text-[10px] text-red-800 hover:bg-red-50 disabled:opacity-50"
              data-testid="cv-avatar-promotion-validation-reject"
              onClick={() => void submit("rejected")}
            >
              {submitting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              반려
            </Button>
          </div>
        </>
      )}

      {error ? (
        <p className="mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
