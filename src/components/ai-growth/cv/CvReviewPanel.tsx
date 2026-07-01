/**
 * CV-1 I5 — Coach Review panel (Internal Pilot · staff only)
 * @see docs/YAGO_CV_LAYER_V1_IMPLEMENTATION_BRIEF.md §10 · I5
 */
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  callExtractApprovedCvSignals,
  callReviewAcademyCvRun,
  parseAcademyCvReviewError,
} from "@/lib/academy/academyCvCallables";
import { loadAcademyCvActiveRun } from "@/lib/academy/academyCvRead";
import type { CvReviewDecision, CvReviewStatus } from "@/lib/academy/academyCvTypes";

type Props = {
  teamId: string;
  mediaId: string;
  refreshKey?: number;
  disabled?: boolean;
  onReviewed?: () => void;
};

function formatMetric(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

function statusLabel(status: CvReviewStatus | undefined): string {
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

function statusBadgeClass(status: CvReviewStatus | undefined): string {
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

function formatReviewedAt(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
}

export function CvReviewPanel({ teamId, mediaId, refreshKey = 0, disabled, onReviewed }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [roiVersion, setRoiVersion] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<CvReviewStatus | undefined>();
  const [sessionConfidence, setSessionConfidence] = useState<number | undefined>();
  const [visibilityRatio, setVisibilityRatio] = useState<number | undefined>();
  const [reviewedBy, setReviewedBy] = useState<string | undefined>();
  const [reviewedAt, setReviewedAt] = useState<string | undefined>();
  const [analysisStatus, setAnalysisStatus] = useState<string>("unknown");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { activeRun } = await loadAcademyCvActiveRun(teamId, mediaId);
      if (!activeRun) {
        setRunId(null);
        return;
      }
      setRunId(activeRun.runId);
      setRoiVersion(activeRun.roiVersion);
      setReviewStatus(activeRun.reviewStatus);
      setSessionConfidence(activeRun.sessionConfidence);
      setVisibilityRatio(activeRun.visibilityRatio);
      setReviewedBy(activeRun.reviewedBy);
      setReviewedAt(activeRun.reviewedAt);
      setAnalysisStatus(activeRun.analysisStatus);
    } catch (e) {
      console.warn("[ACADEMY-CV] review panel load failed", e);
      setError("CV run 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [mediaId, teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const canReview =
    Boolean(runId) &&
    analysisStatus === "completed" &&
    reviewStatus === "candidate" &&
    !submitting &&
    !disabled;

  async function submitReview(decision: CvReviewDecision) {
    if (!runId || !canReview) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await callReviewAcademyCvRun({
        teamId,
        mediaId,
        runId,
        decision,
      });
      setReviewStatus(result.reviewStatus);
      setReviewedBy(result.reviewedBy);
      setReviewedAt(result.reviewedAt);
      if (result.reviewStatus === "approved") {
        try {
          await callExtractApprovedCvSignals({ teamId, mediaId, runId });
          console.info("[ACADEMY-CV] J3 signal extraction after approve OK", { teamId, mediaId, runId });
        } catch (extractErr) {
          console.warn("[ACADEMY-CV] J3 signal extraction after approve failed", extractErr);
        }
      }
      onReviewed?.();
    } catch (e) {
      const parsed = parseAcademyCvReviewError(e);
      setError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        CV 검토 정보 로딩…
      </div>
    );
  }

  if (!runId) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-xl border-2 border-slate-300 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
            CV 검토 · Coach Review
          </h4>
          <p className="mt-1 text-xs text-gray-700">
            active cvRun 검토 · candidate → approved/rejected (Internal Pilot · I5).
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            statusBadgeClass(reviewStatus)
          )}
        >
          {statusLabel(reviewStatus)}
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-gray-900">
        <div className="grid gap-1 sm:grid-cols-2">
          <p>
            Run ID: <strong className="font-mono">{runId.slice(0, 12)}…</strong>
          </p>
          <p>
            ROI Version: <strong>{roiVersion ?? "—"}</strong>
          </p>
          <p>
            Visibility Ratio: <strong>{formatMetric(visibilityRatio)}</strong>
          </p>
          <p>
            Session Confidence: <strong>{formatMetric(sessionConfidence)}</strong>
          </p>
        </div>
        {reviewStatus !== "candidate" ? (
          <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-gray-600">
            reviewedBy: <span className="font-mono">{reviewedBy?.slice(0, 12) ?? "—"}…</span>
            {" · "}
            reviewedAt: {formatReviewedAt(reviewedAt)}
          </p>
        ) : null}
      </div>

      {reviewStatus === "candidate" && analysisStatus === "completed" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!canReview}
            onClick={() => void submitReview("approved")}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                저장 중…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                승인
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canReview}
            onClick={() => void submitReview("rejected")}
          >
            <XCircle className="mr-1 h-4 w-4" />
            반려
          </Button>
        </div>
      ) : null}

      {analysisStatus !== "completed" ? (
        <p className="text-[11px] text-amber-800">
          분석이 완료된 run만 검토할 수 있습니다 (현재: {analysisStatus}).
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}

      <p className="text-[10px] text-gray-500">
        FII · OVR · Avatar · Parent Report 연결 없음 · run 삭제 금지 (D3).
      </p>
    </div>
  );
}
