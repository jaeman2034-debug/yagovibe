/**
 * Vision RC4-4 M4 — useParentIntelligence with fii_summary fallback
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getPlayerGrowthTimeline } from "@/lib/ai-growth/getPlayerGrowthTimeline";
import { loadPlayerGrowthAvatarByPlayerId } from "@/lib/ai-growth/playerGrowthAvatarService";
import { buildParentIntelligenceView } from "@/lib/vision/buildParentIntelligenceView";
import { buildParentIntelligenceFromFiiSummary } from "@/lib/vision/fiiSummaryParentProvider";
import {
  loadFiiSummaryPilotFixture,
  shouldUseFiiSummaryPilot,
} from "@/lib/vision/fiiSummaryLoader";
import {
  buildPeerBenchmarkFromPlayerFii,
  buildPeerBenchmarkIdentity,
} from "@/lib/vision/peerBenchmarkFromPlayerFii";
import { buildPlayerIntelligenceView } from "@/lib/vision/playerIntelligenceProvider";
import type { ParentIntelligenceLoadState } from "@/lib/vision/parentIntelligenceTypes";
import {
  getLatestVisionAnalysis,
  visionAnalysisToResult,
} from "@/lib/vision/visionFirestore";

const TIMELINE_LIMIT = 10;

function readTeamAgeGroup(data: Record<string, unknown> | undefined): string | null {
  const raw = data?.ageGroup;
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return v || null;
}

export function useParentIntelligence(input: {
  teamId: string | undefined;
  playerId: string | undefined;
  playerName?: string;
  matchId?: string | null;
  trackId?: string;
  enabled?: boolean;
}): ParentIntelligenceLoadState {
  const [state, setState] = useState<ParentIntelligenceLoadState>({ status: "loading" });

  useEffect(() => {
    const tid = input.teamId?.trim();
    const pid = input.playerId?.trim();
    const mid = input.matchId?.trim();
    const enabled = input.enabled !== false;

    if (!enabled || !tid || !pid) {
      setState({ status: "empty", message: "경기 분석 리포트를 표시할 수 없습니다." });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    void (async () => {
      try {
        const [teamSnap, avatar, timeline, visionRecord] = await Promise.all([
          getDoc(doc(db, "teams", tid)),
          loadPlayerGrowthAvatarByPlayerId(tid, pid),
          getPlayerGrowthTimeline(tid, pid, TIMELINE_LIMIT).catch(() => null),
          mid ? getLatestVisionAnalysis(tid, mid) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const teamData = teamSnap.data() as Record<string, unknown> | undefined;
        const teamName = String(teamData?.name ?? tid);
        const ageGroup = readTeamAgeGroup(teamData);
        const playerName =
          input.playerName?.trim() ||
          avatar?.playerName?.trim() ||
          "선수";

        const fiiSummaryOpts = {
          playerName,
          teamName,
          teamId: tid,
          playerId: pid,
          trackId: input.trackId,
          ageGroup,
          matchId: mid ?? null,
        };

        if (!visionRecord && shouldUseFiiSummaryPilot(mid)) {
          const docFii = await loadFiiSummaryPilotFixture();
          const view = buildParentIntelligenceFromFiiSummary({
            doc: docFii,
            matchLabel: docFii.matchSummary.headline,
            ...fiiSummaryOpts,
          });
          setState({ status: "ready", view });
          return;
        }

        const visionResult = visionRecord
          ? visionAnalysisToResult(visionRecord)
          : null;

        const coachView = buildPlayerIntelligenceView({
          teamId: tid,
          playerId: pid,
          teamName,
          playerName,
          persona: "parent",
          matchId: mid ?? null,
          trackId: input.trackId,
          visionResult,
          growthAvatar: avatar,
          timeline,
          visionResultSchemaVersion: visionRecord?.visionResultSchemaVersion,
          firestoreSchemaVersion: visionRecord?.schemaVersion,
        });

        if (!visionResult && !avatar && coachView.fii.score == null) {
          if (shouldUseFiiSummaryPilot(mid)) {
            const docFii = await loadFiiSummaryPilotFixture();
            const view = buildParentIntelligenceFromFiiSummary({
              doc: docFii,
              matchLabel: docFii.matchSummary.headline,
              ...fiiSummaryOpts,
            });
            setState({ status: "ready", view });
            return;
          }
          setState({
            status: "empty",
            message: mid
              ? "이 경기의 분석·성장 데이터가 아직 없습니다."
              : "경기 분석은 ?matchId= 로 연결할 수 있습니다.",
          });
          return;
        }

        const peerBenchmark =
          mid && visionResult
            ? buildPeerBenchmarkFromPlayerFii({
                teamId: tid,
                ageGroup,
                matchId: mid,
                playerFii: visionResult.playerFii,
                identity: buildPeerBenchmarkIdentity({
                  teamId: tid,
                  playerId: pid,
                  trackId: input.trackId,
                }),
              })
            : null;

        const view = buildParentIntelligenceView({
          coachView,
          growthAvatar: avatar,
          peerBenchmark,
        });

        setState({ status: "ready", view });
      } catch (e) {
        if (cancelled) return;
        if (shouldUseFiiSummaryPilot(mid)) {
          try {
            const docFii = await loadFiiSummaryPilotFixture();
            const view = buildParentIntelligenceFromFiiSummary({
              doc: docFii,
              playerName: input.playerName?.trim() || "자녀",
              teamName: "팀",
              teamId: tid,
              playerId: pid,
              trackId: input.trackId,
              ageGroup: null,
              matchId: mid ?? null,
            });
            setState({ status: "ready", view });
            return;
          } catch {
            // fall through
          }
        }
        const message =
          e instanceof Error ? e.message : "경기 분석 리포트를 불러오지 못했습니다.";
        setState({ status: "error", message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    input.teamId,
    input.playerId,
    input.playerName,
    input.matchId,
    input.trackId,
    input.enabled,
  ]);

  return state;
}
