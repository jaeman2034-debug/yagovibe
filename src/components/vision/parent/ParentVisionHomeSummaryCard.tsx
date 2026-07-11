/**
 * RC4-4 M4 — Parent Home vision summary (fii_summary pilot)
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import {
  buildParentIntelligenceFromFiiSummary,
} from "@/lib/vision/fiiSummaryParentProvider";
import {
  loadFiiSummaryPilotFixture,
  shouldUseFiiSummaryPilot,
  VISION_PILOT_MATCH_ID,
} from "@/lib/vision/fiiSummaryLoader";
import { buildParentChildGrowthProfilePath } from "@/lib/ai-growth/playerGrowthProfilePath";
import type { ParentIntelligenceView } from "@/lib/vision/parentIntelligenceTypes";

type Props = {
  teamId?: string;
  playerId?: string;
  playerName?: string;
};

export function ParentVisionHomeSummaryCard({ teamId, playerId, playerName }: Props) {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ParentIntelligenceView | null>(null);

  const pilotEnabled = import.meta.env.VITE_VISION_FII_PILOT === "1" || shouldUseFiiSummaryPilot();

  useEffect(() => {
    if (!pilotEnabled) {
      setView(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadFiiSummaryPilotFixture()
      .then((doc) => {
        if (cancelled) return;
        setView(
          buildParentIntelligenceFromFiiSummary({
            doc,
            playerName: playerName ?? "자녀",
            teamName: "팀",
            matchLabel: doc.matchSummary.headline,
          })
        );
      })
      .catch(() => {
        if (!cancelled) setView(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pilotEnabled, playerName]);

  if (!pilotEnabled) return null;

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-4 text-sm text-indigo-800"
        data-testid="parent-vision-home-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        최근 경기 분석 불러오는 중…
      </div>
    );
  }

  if (!view) return null;

  const reportHref =
    teamId && playerId
      ? `${buildParentChildGrowthProfilePath(teamId, playerId)}?matchId=${encodeURIComponent(VISION_PILOT_MATCH_ID)}`
      : null;

  return (
    <section
      className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 shadow-sm"
      data-testid="parent-vision-home-summary"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">
            최근 경기 분석
          </p>
          <h2 className="mt-1 flex items-center gap-1.5 text-base font-black text-indigo-950">
            <Sparkles className="h-4 w-4 text-indigo-600" aria-hidden />
            {view.summary.matchLabel ?? "경기 성장 리포트"}
          </h2>
        </div>
        {view.teamFiiScore != null ? (
          <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
            FII {view.teamFiiScore}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-indigo-900">{view.growthHighlight}</p>
      <p className="mt-2 text-xs text-indigo-800/90">{view.encouragement}</p>
      {reportHref ? (
        <Link
          to={reportHref}
          className="mt-4 inline-flex text-xs font-bold text-indigo-700 underline-offset-2 hover:underline"
          data-testid="parent-vision-home-report-link"
        >
          전체 Parent Report 보기 →
        </Link>
      ) : null}
    </section>
  );
}
