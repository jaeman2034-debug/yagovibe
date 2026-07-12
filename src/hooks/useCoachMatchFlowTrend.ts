/**
 * VOC-012 — load match-flow trend for Coach Vision Report
 */

import { useEffect, useMemo, useState } from "react";
import { loadPreviousVisionAnalysesForTrend } from "@/lib/vision/loadPreviousVisionAnalysesForTrend";
import {
  buildMatchFlowTrendPayload,
  type MatchFlowTrendPayload,
} from "@/lib/vision/matchFlowTrendFromPlayerFii";
import type { CoachDashboardVisionProviderView } from "@/lib/vision/visionTypes";
import { getLatestVisionAnalysis } from "@/lib/vision/visionFirestore";

export type CoachMatchFlowTrendState = {
  loading: boolean;
  error: string | null;
  trend: MatchFlowTrendPayload | null;
};

const IDLE: CoachMatchFlowTrendState = {
  loading: false,
  error: null,
  trend: null,
};

function rankingSignature(
  ranking: CoachDashboardVisionProviderView["playerRanking"] | undefined
): string {
  if (!ranking?.length) return "";
  return ranking
    .map((r) => `${r.rank}:${r.playerId ?? ""}:${r.trackId ?? ""}:${r.fii}`)
    .join("|");
}

export function useCoachMatchFlowTrend(
  teamId: string | undefined,
  matchId: string | undefined,
  view: CoachDashboardVisionProviderView | null,
  enabled = true
): CoachMatchFlowTrendState {
  const [state, setState] = useState<CoachMatchFlowTrendState>({
    ...IDLE,
    loading: Boolean(enabled),
  });

  const sig = useMemo(
    () => rankingSignature(view?.playerRanking),
    [view?.playerRanking]
  );

  useEffect(() => {
    const tid = teamId?.trim();
    const mid = matchId?.trim();
    const ranking = view?.playerRanking;
    if (!enabled || !tid || !mid || !ranking?.length) {
      setState(IDLE);
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const [previous, currentRecord] = await Promise.all([
          loadPreviousVisionAnalysesForTrend({
            teamId: tid,
            currentMatchId: mid,
          }),
          getLatestVisionAnalysis(tid, mid),
        ]);

        if (cancelled) return;

        const currentPlayerFii =
          currentRecord?.playerFii?.length ?
            currentRecord.playerFii
          : ranking.map((r) => ({
              name: r.name,
              fii: r.fii,
              trackId: r.trackId,
              playerId: r.playerId,
              rank: r.rank,
            }));

        const trend = buildMatchFlowTrendPayload({
          currentMatchId: mid,
          currentPlayerFii,
          previousMatches: previous,
          ranking,
        });

        setState({ loading: false, error: null, trend });
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "최근 경기 흐름을 불러오지 못했습니다.";
        setState({ loading: false, error: message, trend: null });
      }
    })();

    return () => {
      cancelled = true;
    };
    // sig stands in for ranking contents; avoid depending on view object identity
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sig + ids
  }, [teamId, matchId, enabled, sig]);

  return state;
}
