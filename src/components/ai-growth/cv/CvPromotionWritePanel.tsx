/**
 * CV-1 I10-3-2-2 — Conditional SoT Write (promote validated preview)
 */
import { ArrowUpCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  callPromoteCvGrowthToPlayerOvr,
  parsePromotionWriteError,
} from "@/lib/academy/academyCvCallables";
import type { PromotionPreviewSnapshotDto } from "@/lib/academy/academyCvPromotionPreviewReadTypes";
import { formatCvProcessedAt } from "@/components/ai-growth/cv/cvRunUiHelpers";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string;
  preview: PromotionPreviewSnapshotDto;
  onPromoted?: () => void;
};

export function CvPromotionWritePanel({ teamId, mediaId, linkId, preview, onPromoted }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(preview.status);
  const [auditId, setAuditId] = useState(preview.promotionAuditId);
  const [promotedBy, setPromotedBy] = useState(preview.promotedBy);
  const [promotedAt, setPromotedAt] = useState(preview.promotedAt);
  const [afterOvr, setAfterOvr] = useState<number | null>(null);

  const canPromote =
    status === "preview" && preview.validationStatus === "validated";

  async function promote() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await callPromoteCvGrowthToPlayerOvr({
        teamId,
        mediaId,
        linkId,
        previewId: preview.previewId,
      });
      setStatus("promoted");
      setAuditId(result.auditId);
      setPromotedBy(result.promotedBy);
      setPromotedAt(result.promotedAt);
      setAfterOvr(result.afterOvr);
      onPromoted?.();
    } catch (e) {
      const parsed = parsePromotionWriteError(e);
      if (parsed.message.includes("already-promoted")) {
        setError("이미 승격된 promotion preview입니다.");
      } else {
        setError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "promoted") {
    return (
      <div
        className="mt-2 rounded-md border border-emerald-400 bg-emerald-50/80 px-2 py-1.5"
        data-testid="cv-promotion-write-panel"
      >
        <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-900">
          <CheckCircle2 className="h-3 w-3" />
          Promoted (I10-3-2-2)
        </p>
        <p className="mt-1 font-mono text-[10px] text-emerald-950">
          auditId: {auditId?.slice(0, 12) ?? "—"}… · ovr {afterOvr ?? preview.proposedOvr}
        </p>
        <p className="text-[10px] text-gray-600">
          {promotedBy?.slice(0, 8)}… · {formatCvProcessedAt(promotedAt)}
        </p>
      </div>
    );
  }

  if (!canPromote) {
    return null;
  }

  return (
    <div
      className="mt-2 rounded-md border border-violet-300 bg-violet-50/60 px-2 py-1.5"
      data-testid="cv-promotion-write-panel"
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-900">
        <ArrowUpCircle className="h-3 w-3" />
        Conditional SoT Write (I10-3-2-2)
      </p>
      <p className="mt-1 text-[10px] text-violet-950">
        Replace → playerGrowthOvr · source=cv_promotion · audit append
      </p>
      <Button
        type="button"
        size="sm"
        disabled={submitting}
        className="mt-2 h-7 bg-violet-700 text-[10px] hover:bg-violet-800"
        onClick={() => void promote()}
      >
        {submitting ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <ArrowUpCircle className="mr-1 h-3 w-3" />
        )}
        Promote to SoT
      </Button>
      {error ? (
        <p className="mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
