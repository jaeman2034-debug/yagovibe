/**
 * Vision v6-5 — load player intelligence (Firestore) → single ViewModel
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getPlayerGrowthTimeline } from "@/lib/ai-growth/getPlayerGrowthTimeline";
import { loadPlayerGrowthAvatarByPlayerId } from "@/lib/ai-growth/playerGrowthAvatarService";
import { buildPlayerIntelligenceView } from "@/lib/vision/playerIntelligenceProvider";
import type {
  PlayerIntelligenceLoadState,
  PlayerIntelligencePersona,
} from "@/lib/vision/playerIntelligenceTypes";
import {
  getLatestVisionAnalysis,
  visionAnalysisToResult,
} from "@/lib/vision/visionFirestore";

const TIMELINE_LIMIT = 10;

export function usePlayerIntelligence(input: {
  teamId: string | undefined;
  playerId: string | undefined;
  playerName?: string;
  matchId?: string | null;
  trackId?: string;
  persona: PlayerIntelligencePersona | null;
  enabled?: boolean;
}): PlayerIntelligenceLoadState {
  const [state, setState] = useState<PlayerIntelligenceLoadState>({ status: "loading" });

  useEffect(() => {
    const tid = input.teamId?.trim();
    const pid = input.playerId?.trim();
    const mid = input.matchId?.trim();
    const persona = input.persona;
    const enabled = input.enabled !== false;

    if (!enabled || !tid || !pid || !persona) {
      setState({ status: "empty", message: "선수 Intelligence를 표시할 수 없습니다." });
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

        const teamName = String(teamSnap.data()?.name ?? tid);
        const playerName =
          input.playerName?.trim() ||
          avatar?.playerName?.trim() ||
          "선수";

        const visionResult = visionRecord
          ? visionAnalysisToResult(visionRecord)
          : null;

        const view = buildPlayerIntelligenceView({
          teamId: tid,
          playerId: pid,
          teamName,
          playerName,
          persona,
          matchId: mid ?? null,
          trackId: input.trackId,
          visionResult,
          growthAvatar: avatar,
          timeline,
          visionResultSchemaVersion: visionRecord?.visionResultSchemaVersion,
          firestoreSchemaVersion: visionRecord?.schemaVersion,
        });

        if (!visionResult && !avatar && view.fii.score == null) {
          setState({
            status: "empty",
            message: mid
              ? "이 경기의 Vision·성장 데이터가 아직 없습니다."
              : "성장·Vision 데이터가 쌓이면 표시됩니다. 경기 분석은 ?matchId= 로 연결할 수 있습니다.",
          });
          return;
        }

        setState({ status: "ready", view });
      } catch (e) {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "Player Intelligence를 불러오지 못했습니다.";
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
    input.persona,
    input.enabled,
  ]);

  return state;
}
