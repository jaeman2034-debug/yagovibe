import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type {
  TeamCoachRecommendation,
  TeamGrowthSnapshot,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";
import type {
  TeamWeeklyDigest,
  TeamWeeklyDigestAiDigest,
  TeamWeeklyDigestRecommendation,
  TeamWeeklyDigestRiskPlayer,
} from "@/lib/ai-growth/teamWeeklyDigestTypes";
import { buildWeeklyGrowthDigestEnrichment } from "@/lib/ai-growth/weeklyGrowthDigestEngine";
import { seoulWeekBounds } from "@/lib/ai-growth/weeklyDigestGenerator";

export type TeamWeeklyDigestInput = {
  teamName: string;
  snapshot: TeamGrowthSnapshot;
  players: TeamPlayerGrowthRow[];
  atRiskPlayers: TeamPlayerGrowthRow[];
  coachRecommendations: TeamCoachRecommendation[];
  avatars: Array<{
    playerId: string;
    playerName: string;
    avatar: PlayerGrowthAvatarDoc;
    timeline: PlayerGrowthTimeline | null;
  }>;
  nowMs?: number;
};

function formatWeekLabel(weekKey: string): string {
  const match = /^(\d{4})W(\d{2})$/.exec(weekKey);
  if (!match) return weekKey;
  return `${match[1]}년 ${Number(match[2])}주차`;
}

function aggregateFocusTraining(
  enrichments: Array<{ focusRecommendation: string | null }>,
  coachRecommendations: TeamCoachRecommendation[]
): string | null {
  const counts = new Map<string, number>();
  for (const e of enrichments) {
    const focus = e.focusRecommendation?.trim();
    if (!focus) continue;
    counts.set(focus, (counts.get(focus) ?? 0) + 1);
  }

  let top: string | null = null;
  let topCount = 0;
  for (const [label, count] of counts) {
    if (count > topCount) {
      top = label;
      topCount = count;
    }
  }

  if (top) return top;

  const recoveryRec = coachRecommendations.find((r) => r.id === "team-recovery-focus");
  if (recoveryRec) return "Recovery";

  return coachRecommendations[0]?.title.replace(/^회복\(Recovery\) /, "Recovery") ?? null;
}

function buildTopRecommendations(
  coachRecommendations: TeamCoachRecommendation[]
): TeamWeeklyDigestRecommendation[] {
  return coachRecommendations
    .filter((r) => r.id !== "team-maintain-momentum")
    .slice(0, 3)
    .map((r) => ({
      label: r.title,
      playerCount: r.affectedPlayerNames.length,
    }));
}

function buildRiskPlayers(atRiskPlayers: TeamPlayerGrowthRow[]): TeamWeeklyDigestRiskPlayer[] {
  return atRiskPlayers.map((p) => ({
    playerId: p.playerId,
    playerName: p.playerName,
    riskLabels: p.risks.map((r) => r.title),
  }));
}

function buildTeamWeeklyAiDigest(
  teamName: string,
  snapshot: TeamGrowthSnapshot,
  riskPlayers: TeamWeeklyDigestRiskPlayer[],
  focusTraining: string | null
): TeamWeeklyDigestAiDigest {
  const name = teamName.trim() || "팀";
  const paragraphs: string[] = [];

  if (snapshot.trackedCount === 0) {
    paragraphs.push(
      `${name}에는 이번 주 추적 가능한 성장 데이터가 없습니다.`,
      "Step5에서 훈련 리포트를 저장하면 팀 주간 요약이 생성됩니다."
    );
    return { paragraphs, fullText: paragraphs.join("\n\n") };
  }

  paragraphs.push(
    `${name}은(는) 현재 ${snapshot.trackedCount}명의 선수를 추적 중입니다.`,
    `평균 OVR은 ${snapshot.avgOvr}, 평균 Level은 ${snapshot.avgLevel}입니다.`
  );

  if (riskPlayers.length > 0) {
    const names = riskPlayers.slice(0, 3).map((p) => p.playerName);
    const riskHint = riskPlayers[0]?.riskLabels.slice(0, 2).join(" 및 ") ?? "성장 위험";
    paragraphs.push(
      `${names.join(", ")} 선수에게 ${riskHint}이(가) 감지되었습니다.`
    );
  } else {
    paragraphs.push("이번 주 팀 전체에 즉시 대응이 필요한 위험 신호는 없습니다.");
  }

  if (focusTraining) {
    paragraphs.push(`다음 주에는 ${focusTraining} 훈련 비중 확대가 권장됩니다.`);
  }

  const fullText = paragraphs.join("\n\n");
  return { paragraphs, fullText };
}

/** Sprint E-1.2-a — D-5.3 개인 주간 요약 → 팀 WeeklyDigest 롤업 */
export function buildTeamWeeklyDigest(input: TeamWeeklyDigestInput): TeamWeeklyDigest {
  const { weekKey, startMs, endMs } = seoulWeekBounds(input.nowMs ?? Date.now());

  const enrichments = input.avatars.map((entry) =>
    buildWeeklyGrowthDigestEnrichment({
      avatar: entry.avatar,
      timeline: entry.timeline,
      digestSummary: {
        scoreCurrent: entry.avatar.ovr,
        scorePrevious: null,
        delta: entry.avatar.weeklyDeltaOvr ?? null,
      },
      weekStartMs: startMs,
      weekEndMs: endMs,
    })
  );

  const newBadges = [
    ...new Set(enrichments.flatMap((e) => e.newBadges)),
  ];

  const focusTraining = aggregateFocusTraining(enrichments, input.coachRecommendations);
  const riskPlayers = buildRiskPlayers(input.atRiskPlayers);
  const topRecommendations = buildTopRecommendations(input.coachRecommendations);
  const summary = buildTeamWeeklyAiDigest(
    input.teamName,
    input.snapshot,
    riskPlayers,
    focusTraining
  );

  return {
    weekKey,
    weekLabel: formatWeekLabel(weekKey),
    trackedPlayers: input.snapshot.trackedCount,
    rosterCount: input.snapshot.rosterCount,
    avgOvr: input.snapshot.avgOvr,
    avgLevel: input.snapshot.avgLevel,
    riskPlayerCount: riskPlayers.length,
    riskPlayers,
    newBadges,
    focusTraining,
    topRecommendations,
    summary,
  };
}
