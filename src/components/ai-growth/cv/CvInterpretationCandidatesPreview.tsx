/**
 * CV-1 I8-3/I8-4 — Interpretation Candidates Internal Preview + Coach Review
 */
import { Layers, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { callGenerateInterpretationCandidates } from "@/lib/academy/academyCvCallables";
import { formatSignalInterpretation } from "@/lib/academy/cvInterpretationCopy";
import { CvInterpretationCandidateReviewPanel } from "@/components/ai-growth/cv/CvInterpretationCandidateReviewPanel";
import type { InterpretationCandidateSnapshotDto } from "@/lib/academy/academyCvInterpretationReadTypes";

type Props = {
  teamId: string;
  mediaId: string;
  linkId: string | null;
  candidates: InterpretationCandidateSnapshotDto[];
  linkAccepted?: boolean;
  onReviewed?: () => void;
};

function typeBadgeClass(type: InterpretationCandidateSnapshotDto["candidateType"]): string {
  switch (type) {
    case "quality":
      return "border-slate-300 bg-slate-50 text-slate-800";
    case "movement":
      return "border-indigo-300 bg-indigo-50 text-indigo-900";
    case "physical":
      return "border-orange-300 bg-orange-50 text-orange-950";
    default:
      return "border-gray-300 bg-gray-50 text-gray-800";
  }
}

function reviewBadgeClass(
  status: InterpretationCandidateSnapshotDto["reviewStatus"]
): string {
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

function formatConfidence(n: number): string {
  return n.toFixed(2);
}

export function CvInterpretationCandidatesPreview({
  teamId,
  mediaId,
  linkId,
  candidates,
  linkAccepted = false,
  onReviewed,
}: Props) {
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  async function handleRunClassification() {
    if (!linkId || classifying) return;
    setClassifying(true);
    setClassifyError(null);
    try {
      const result = await callGenerateInterpretationCandidates({
        teamId,
        mediaId,
        linkId,
      });
      console.info("[ACADEMY-CV] I8-2 manual classification OK", result);
      onReviewed?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "I8-2 classification 실패";
      console.error("[ACADEMY-CV] I8-2 classification failed", e);
      setClassifyError(message);
    } finally {
      setClassifying(false);
    }
  }

  return (
    <div className="rounded-lg border border-cyan-200 bg-cyan-50/40 px-3 py-2 text-xs text-gray-900">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-900">
        <Layers className="h-3.5 w-3.5" />
        Interpretation Candidates (I8-3)
      </p>
      {linkId ? (
        <p className="mt-1 font-mono text-[10px] text-cyan-800">
          linkId: {linkId.slice(0, 12)}… · {candidates.length} candidate
          {candidates.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {candidates.length === 0 ? (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-gray-600">
            interpretationCandidates 없음 — accepted cvGrowthLink에 대해 I8-2 classification 후
            표시됩니다.
          </p>
          {linkId && linkAccepted ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="border-cyan-300 text-cyan-900"
              disabled={classifying}
              onClick={() => void handleRunClassification()}
            >
              {classifying ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Classification…
                </>
              ) : (
                "Interpretation Classification (I8-2) 실행"
              )}
            </Button>
          ) : null}
          {classifyError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-red-800">
              {classifyError}
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {candidates.map((c) => (
            <li
              key={c.candidateId}
              className="rounded-md border border-cyan-100 bg-white/80 px-2 py-1.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    typeBadgeClass(c.candidateType)
                  )}
                >
                  {c.candidateType}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    reviewBadgeClass(c.reviewStatus)
                  )}
                >
                  {c.reviewStatus ?? "candidate"}
                </span>
                <span className="text-[10px] text-gray-600">
                  confidence {formatConfidence(c.confidence)}
                </span>
              </div>
              <ul className="mt-1.5 space-y-0.5 font-mono text-[10px] text-gray-700">
                {c.sourceSignals.map((s) => {
                  const line = formatSignalInterpretation(s.key, s.value);
                  return (
                    <li key={`${c.candidateId}-${s.key}`}>
                      {s.key} = {formatConfidence(s.value)}
                      {line ? (
                        <span className="mt-0.5 block font-sans text-[11px] text-gray-800">
                          → {line}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {linkId ? (
                <CvInterpretationCandidateReviewPanel
                  teamId={teamId}
                  mediaId={mediaId}
                  linkId={linkId}
                  candidate={c}
                  onReviewed={onReviewed}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[10px] text-gray-500">
        I8-4 Coach Review · FII · OVR · Avatar · Parent · Growth Mapping 금지 (I8-3/I8-4 LOCK).
      </p>
    </div>
  );
}
