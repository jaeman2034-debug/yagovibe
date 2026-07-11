/**
 * RC4-6 M6 — End-to-End Demo page
 * Route: /teams/:teamId/vision/demo
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { VisionE2EPipelineProgress } from "@/components/vision/VisionE2EPipelineProgress";
import { VisionPlatformNav } from "@/components/vision/VisionPlatformNav";
import { loadE2EDemoSummary } from "@/lib/vision/e2eDemoLoader";
import type { E2EDemoSummary } from "@/lib/vision/e2eDemoTypes";
import {
  visionCoachDashboardPath,
  visionMatchDetailPath,
  visionParentHomePath,
  visionTeamHubPath,
  visionTimelinePath,
} from "@/lib/vision/visionPlatformRoutes";

export default function VisionE2EDemoPage() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<E2EDemoSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadE2EDemoSummary()
      .then((doc) => {
        if (!cancelled) setSummary(doc);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "데모 요약을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!teamId.trim()) {
    return (
      <div className="px-4 py-8 text-sm text-violet-800">팀 ID가 필요합니다.</div>
    );
  }

  const matchId = summary?.pilotMatchId ?? "vision-pilot-pass01-clip-002";

  return (
    <div className="min-h-screen bg-violet-50/40" data-testid="vision-e2e-demo-page">
      <div className="border-b border-violet-100 bg-white px-4 py-3">
        <Link
          to={visionTeamHubPath(teamId, matchId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-violet-800 underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          팀 플레이로 돌아가기
        </Link>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <header>
          <h1 className="text-xl font-black text-violet-950">Vision End-to-End Demo</h1>
          <p className="mt-1 text-xs text-violet-800/80">
            RC4-6 M6 — 업로드부터 Coach · Parent · Timeline까지 단일 흐름
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-violet-700">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            데모 상태 불러오는 중…
          </div>
        ) : error ? (
          <p className="text-sm text-rose-700">{error}</p>
        ) : summary ? (
          <>
            <VisionE2EPipelineProgress summary={summary} variant="light" />
            <VisionPlatformNav
              teamId={teamId}
              matchId={matchId}
              current="team-hub"
              variant="light"
            />
            <section className="rounded-2xl border border-violet-200 bg-white p-4 text-sm">
              <h2 className="font-bold text-violet-950">데모 화면 바로가기</h2>
              <ul className="mt-2 space-y-1.5 text-xs text-violet-800">
                <li>
                  <Link
                    to={visionCoachDashboardPath(teamId, matchId)}
                    className="font-semibold underline"
                  >
                    Coach Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to={visionMatchDetailPath(teamId, matchId)}
                    className="font-semibold underline"
                  >
                    Match Detail
                  </Link>
                </li>
                <li>
                  <Link
                    to={visionTimelinePath(teamId, matchId)}
                    className="font-semibold underline"
                  >
                    Timeline
                  </Link>
                </li>
                <li>
                  <Link to={visionParentHomePath()} className="font-semibold underline">
                    Parent Home
                  </Link>
                </li>
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
