import { buildGrowthAiSummaryFromAvatar } from "@/lib/ai-growth/growthAiSummaryEngine";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type {
  TeamGrowthAiSummary,
  TeamGrowthSnapshot,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";
import type {
  TeamGrowthSummary,
  TeamPlayerCoachSummary,
} from "@/lib/ai-growth/teamGrowthSummaryTypes";
import type { TeamWeeklyDigest } from "@/lib/ai-growth/teamWeeklyDigestTypes";

export type TeamGrowthSummaryInput = {
  teamName: string;
  snapshot: TeamGrowthSnapshot;
  weeklyDigest: TeamWeeklyDigest | null;
  atRiskPlayers: TeamPlayerGrowthRow[];
  coachRecommendations: Array<{ title: string; detail: string }>;
  aiSummary: TeamGrowthAiSummary;
  avatars: Array<{
    playerId: string;
    playerName: string;
    avatar: PlayerGrowthAvatarDoc;
    timeline: PlayerGrowthTimeline | null;
    attendanceRatePct: number | null;
  }>;
};

function buildPlayerCoachSummaries(
  avatars: TeamGrowthSummaryInput["avatars"]
): TeamPlayerCoachSummary[] {
  return avatars.map((entry) => {
    const result = buildGrowthAiSummaryFromAvatar({
      playerName: entry.playerName,
      avatar: entry.avatar,
      timeline: entry.timeline,
      attendanceRatePct: entry.attendanceRatePct,
    });
    return {
      playerId: entry.playerId,
      playerName: entry.playerName || entry.avatar.playerName,
      ovr: entry.avatar.ovr,
      level: entry.avatar.level,
      coach: result.coach,
    };
  });
}

/** Sprint E-1.3 — 팀 인텔리전스 + 주간 Digest + 선수별 코치 AI 요약 통합 */
export function buildTeamGrowthSummary(input: TeamGrowthSummaryInput): TeamGrowthSummary {
  const name = input.teamName.trim() || "팀";
  const { snapshot, weeklyDigest, atRiskPlayers, coachRecommendations, aiSummary } = input;

  const playerSummaries = buildPlayerCoachSummaries(input.avatars);

  if (snapshot.trackedCount === 0) {
    const overviewBullets = [
      "아직 성장 추적 중인 선수가 없습니다.",
      "Step5에서 훈련 리포트를 저장하면 팀 요약이 생성됩니다.",
    ];
    const closingParagraphs = overviewBullets;
    return {
      headline: `${name} — 팀 성장 요약`,
      overviewBullets,
      playerSummaries: [],
      closingParagraphs,
      fullText: [overviewBullets.join(" "), ...closingParagraphs].join("\n\n"),
    };
  }

  const overviewBullets: string[] = [
    `추적 선수 ${snapshot.trackedCount}/${snapshot.rosterCount}명 · 평균 OVR ${snapshot.avgOvr} · Level ${snapshot.avgLevel}`,
  ];

  if (weeklyDigest) {
    overviewBullets.push(
      `${weeklyDigest.weekLabel} · 위험 선수 ${weeklyDigest.riskPlayerCount}명${
        weeklyDigest.focusTraining ? ` · 집중 훈련 ${weeklyDigest.focusTraining}` : ""
      }`
    );
    if (weeklyDigest.newBadges.length > 0) {
      overviewBullets.push(`신규 배지: ${weeklyDigest.newBadges.join(", ")}`);
    }
  }

  if (atRiskPlayers.length > 0) {
    const names = atRiskPlayers.slice(0, 3).map((p) => p.playerName).join(", ");
    overviewBullets.push(`우선 점검: ${names}`);
  }

  const primaryRec = coachRecommendations[0];
  if (primaryRec) {
    overviewBullets.push(`코치 권장: ${primaryRec.title}`);
  }

  const closingParagraphs = [
    ...aiSummary.paragraphs,
    ...(weeklyDigest?.summary.paragraphs ?? []),
  ].filter((p, i, arr) => arr.indexOf(p) === i);

  const headline = `${name} — ${snapshot.trackedCount}명 추적 · OVR ${snapshot.avgOvr}`;

  return {
    headline,
    overviewBullets,
    playerSummaries,
    closingParagraphs,
    fullText: [headline, ...overviewBullets, ...closingParagraphs].join("\n\n"),
  };
}
