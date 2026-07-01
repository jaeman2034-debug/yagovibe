/**
 * CV-1 I6-4 — Review timeline (candidate → approved/rejected)
 */
import { ArrowDown } from "lucide-react";
import type { AcademyCvRunSnapshot } from "@/lib/academy/academyCvRead";
import { formatCvProcessedAt } from "@/components/ai-growth/cv/cvRunUiHelpers";
import { CvReviewStatusBadge } from "@/components/ai-growth/cv/CvReviewStatusBadge";

type Props = {
  run: AcademyCvRunSnapshot;
};

export function CvReviewTimeline({ run }: Props) {
  const finalStatus = run.reviewStatus;
  const hasReview = finalStatus === "approved" || finalStatus === "rejected";

  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs text-gray-800">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Review Timeline</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <CvReviewStatusBadge status="candidate" />
        {hasReview ? (
          <>
            <ArrowDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            <CvReviewStatusBadge status={finalStatus} />
          </>
        ) : (
          <span className="text-[11px] text-slate-500">검토 대기</span>
        )}
      </div>
      {hasReview ? (
        <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-gray-600">
          reviewedBy: <span className="font-mono">{run.reviewedBy?.slice(0, 12) ?? "—"}…</span>
          {" · "}
          reviewedAt: {formatCvProcessedAt(run.reviewedAt)}
        </p>
      ) : null}
    </div>
  );
}
