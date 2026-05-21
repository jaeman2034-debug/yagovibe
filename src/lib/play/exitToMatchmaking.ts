import { commitHostMatchState, getLiveMatchBridge, setLiveMatchBridge } from "@/lib/live/liveMatchBridge";
import {
  callClearActiveMatch,
  callLeaveMatch,
  callLeaveQueue,
} from "@/lib/matchmaking/matchmakingClient";
import type { MatchmakingMode } from "@/lib/matchmaking/types";
import { instantPlayPath, matchmakingPath } from "@/lib/play/playEcosystemRoutes";
import {
  clearSkipActiveSessionRedirect,
  setSkipActiveSessionRedirect,
} from "@/lib/play/liveSessionExit";
import type { NavigateFunction } from "react-router-dom";

export type ExitLiveMatchOptions = {
  matchId?: string;
  sessionId?: string;
  /** RTDB match.phase = ended (호스트만 유효) */
  isHost?: boolean;
  queueMode?: MatchmakingMode;
  /** rematch: 즉시 플레이(/game), leave: 매치메이킹 상세 */
  destination?: "play" | "matchmaking";
};

/**
 * 라이브 세션 종료
 * - 화면은 즉시 이동 (callable 대기로 버튼 무반응 방지)
 * - skip 플래그로 started 매치 자동 복귀 차단 (QuickPlay/Matchmaking에서 소비)
 * - presence·매치 큐는 백그라운드 정리
 */
export async function exitLiveMatchToMatchmaking(
  navigate: NavigateFunction,
  opts: ExitLiveMatchOptions = {},
): Promise<void> {
  const matchId = opts.matchId?.trim();
  const sessionId = opts.sessionId?.trim();
  const destination = opts.destination ?? "matchmaking";
  const queueMode = opts.queueMode ?? "5v5";

  setSkipActiveSessionRedirect();

  const bridge = getLiveMatchBridge();
  setLiveMatchBridge(null);

  if (opts.isHost && sessionId && bridge) {
    try {
      commitHostMatchState(sessionId, {
        match: {
          ...bridge.snapshot.match,
          phase: "ended",
          goalResetAt: 0,
          timeRemainingMs: 0,
        },
      });
    } catch (e) {
      console.warn("[exitToMatchmaking] commit ended failed", e);
    }
  }

  if (matchId) {
    try {
      await callClearActiveMatch(matchId);
    } catch (e) {
      console.warn("[exitToMatchmaking] clearActiveMatch failed", e);
    }
  }
  try {
    await callLeaveQueue(queueMode);
  } catch (e) {
    console.warn("[exitToMatchmaking] leaveQueue failed", e);
  }
  if (matchId) {
    try {
      await callLeaveMatch(matchId);
    } catch (e) {
      console.warn("[exitToMatchmaking] leaveMatch failed", e);
    }
  }

  navigate(destination === "play" ? instantPlayPath() : matchmakingPath(), { replace: true });
}

/** 매치 재입장 허용 (큐에서 「경기 시작」 눌렀을 때) */
export function allowActiveSessionRedirect(): void {
  clearSkipActiveSessionRedirect();
}
