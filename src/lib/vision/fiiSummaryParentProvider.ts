/**
 * RC4-4 M4 — fii_summary parentInsights → Parent Intelligence View
 */

import type { FiiSummaryDocument } from "@/lib/vision/fiiSummaryTypes";
import type { ParentIntelligenceView } from "@/lib/vision/parentIntelligenceTypes";
import {
  buildPeerBenchmarkFromPlayerFii,
  buildPeerBenchmarkIdentity,
  fiiSummaryPlayersToPlayerFii,
} from "@/lib/vision/peerBenchmarkFromPlayerFii";

export type BuildParentFromFiiSummaryInput = {
  doc: FiiSummaryDocument;
  playerName?: string;
  teamName?: string;
  matchLabel?: string | null;
  /** VOC-011 */
  teamId?: string;
  playerId?: string;
  trackId?: string;
  ageGroup?: string | null;
  matchId?: string | null;
};

export function buildParentIntelligenceFromFiiSummary(
  input: BuildParentFromFiiSummaryInput
): ParentIntelligenceView {
  const { doc } = input;
  const parent = doc.parentInsights;
  const coach = doc.coachInsights;
  const top = doc.playerFii[0];
  const playerName =
    input.playerName?.trim() || top?.name?.replace(/^Player\s*/, "선수 ") || "자녀";
  const teamName = input.teamName?.trim() || "팀";

  const sessionSummary = parent?.summaryKo ?? doc.matchSummary.summary;
  const growthHighlight =
    parent?.growthHighlight ??
    `${playerName} 선수가 경기에서 팀 플레이에 참여한 구간이 확인됩니다.`;
  const encouragement =
    parent?.encouragement ??
    "꾸준한 참여가 성장의 기반입니다. 다음 경기도 응원해 주세요.";
  const nextTraining =
    coach.recommendations[0] ??
    "집에서 가벼운 패스·볼 컨트롤 연습을 함께 해 보세요.";

  const narrativeParts = [growthHighlight];
  if (sessionSummary && !growthHighlight.includes(sessionSummary.slice(0, 16))) {
    narrativeParts.push(sessionSummary);
  }

  const teamId = input.teamId?.trim() ?? "";
  const matchId = input.matchId?.trim() ?? "";
  const playerId = input.playerId?.trim() ?? "";
  const peerBenchmark =
    teamId && matchId && playerId
      ? buildPeerBenchmarkFromPlayerFii({
          teamId,
          ageGroup: input.ageGroup,
          matchId,
          playerFii: fiiSummaryPlayersToPlayerFii(doc.playerFii),
          identity: buildPeerBenchmarkIdentity({
            teamId,
            playerId,
            trackId: input.trackId,
          }),
        })
      : null;

  return {
    summary: {
      playerName,
      teamName,
      matchLabel: input.matchLabel ?? doc.matchSummary.headline ?? null,
    },
    narrativeSummary: narrativeParts.slice(0, 2).join("\n\n"),
    explainable: {
      title: parent?.teamFiiScore != null ? `팀 경기 흐름 · FII ${parent.teamFiiScore}` : "이번 경기 하이라이트",
      bullets: [
        growthHighlight,
        parent?.passCount != null
          ? `패스 ${parent.passCount}회 · 볼 받기 ${parent.receiveCount ?? 0}회 참여`
          : doc.matchSummary.headline,
      ].filter(Boolean),
    },
    emotionSummary: encouragement,
    recommendation: nextTraining,
    strengths: [growthHighlight],
    matchSummary: sessionSummary,
    hasVisionAnalysis: true,
    fiiDataSource: "fii_summary",
    sessionSummary,
    growthHighlight,
    encouragement,
    nextTraining,
    teamFiiScore: parent?.teamFiiScore ?? doc.teamFii.overall ?? null,
    peerBenchmark,
  };
}
