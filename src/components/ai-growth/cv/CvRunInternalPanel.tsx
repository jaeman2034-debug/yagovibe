/**
 * CV-1 I6 — Internal pilot: History · Active Run · Compare · Timeline
 * @see docs/YAGO_CV_LAYER_I6_INTERNAL_BRIEF.md
 */
import { Layers, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { loadAcademyCvRunsContext } from "@/lib/academy/academyCvRead";
import { CvActiveRunCard } from "@/components/ai-growth/cv/CvActiveRunCard";
import { CvReviewTimeline } from "@/components/ai-growth/cv/CvReviewTimeline";
import { CvRunCompareCard } from "@/components/ai-growth/cv/CvRunCompareCard";
import { CvRunHistoryList } from "@/components/ai-growth/cv/CvRunHistoryList";
import { CvGrowthInternalSection } from "@/components/ai-growth/cv/CvGrowthInternalSection";

type Props = {
  teamId: string;
  mediaId: string;
  refreshKey?: number;
};

export function CvRunInternalPanel({ teamId, mediaId, refreshKey = 0 }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | undefined>();
  const [activeRun, setActiveRun] = useState<
    Awaited<ReturnType<typeof loadAcademyCvRunsContext>>["activeRun"]
  >(null);
  const [runs, setRuns] = useState<Awaited<ReturnType<typeof loadAcademyCvRunsContext>>["runs"]>(
    []
  );
  const [previousRun, setPreviousRun] = useState<
    Awaited<ReturnType<typeof loadAcademyCvRunsContext>>["previousRun"]
  >(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ctx = await loadAcademyCvRunsContext(teamId, mediaId);
      setActiveRunId(ctx.media?.cvActiveRunId);
      setActiveRun(ctx.activeRun);
      setRuns(ctx.runs);
      setPreviousRun(ctx.previousRun);
    } catch (e) {
      console.warn("[ACADEMY-CV] I6 panel load failed", e);
      setError("CV run 이력을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [mediaId, teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        CV run 이력 로딩…
      </div>
    );
  }

  if (runs.length === 0 && !activeRun) {
    return (
      <div className="space-y-2 rounded-xl border-2 border-slate-300 bg-slate-50/40 p-4" data-testid="cv-run-internal-empty">
        <h4 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Layers className="h-5 w-5 text-slate-700" />
          CV Run · Internal (I6)
        </h4>
        <p className="text-xs text-gray-700">
          mediaId: <code className="font-mono text-[10px]">{mediaId}</code>
        </p>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
            {" · "}
            coach/admin(staff) 또는 플랫폼 ADMIN 계정 · Functions{" "}
            <code className="font-mono text-[10px]">getAcademyCvRunsContext</code> 배포 확인
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-3 py-3 text-xs text-gray-600">
            cvRuns 이력이 없습니다. ROI 분석을 실행하면 run이 생성됩니다.
          </p>
        )}
        <CvGrowthInternalSection
          teamId={teamId}
          mediaId={mediaId}
          refreshKey={refreshKey}
          cvActiveRunId={activeRunId}
          cvRunReviewStatus={activeRun?.reviewStatus}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border-2 border-slate-300 bg-slate-50/40 p-4" data-testid="cv-run-internal-panel">
      <div>
        <h4 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Layers className="h-5 w-5 text-slate-700" />
          CV Run · Internal (I6)
        </h4>
        <p className="mt-1 text-xs text-gray-700">
          History · Active Run · Compare · Review Timeline — read-only · Growth Pipeline 미연결.
        </p>
      </div>

      {activeRun ? (
        <CvActiveRunCard activeRun={activeRun} cvActiveRunId={activeRunId} />
      ) : null}

      {activeRun && previousRun ? (
        <CvRunCompareCard activeRun={activeRun} previousRun={previousRun} />
      ) : null}

      {activeRun ? <CvReviewTimeline run={activeRun} /> : null}

      <CvRunHistoryList runs={runs} activeRunId={activeRunId} />

      <CvGrowthInternalSection
        teamId={teamId}
        mediaId={mediaId}
        refreshKey={refreshKey}
        cvActiveRunId={activeRunId}
        cvRunReviewStatus={activeRun?.reviewStatus}
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}

      <p className="text-[10px] text-gray-500">
        FII · OVR · Avatar · Parent Report · Auto Promotion 금지 (I6 LOCK).
      </p>
    </div>
  );
}
