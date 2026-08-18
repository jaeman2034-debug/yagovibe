import { analyzeGrowthRisks } from "@/lib/ai-growth/growthRiskDetectionEngine";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type {
  TeamCoachRecommendation,
  TeamGrowthAiSummary,
  TeamGrowthIntelligenceResult,
  TeamGrowthSnapshot,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";
import { buildTeamWeeklyDigest } from "@/lib/ai-growth/teamWeeklyDigestEngine";
import { buildTeamGrowthSummary } from "@/lib/ai-growth/teamGrowthSummaryEngine";
import { buildCoachActionCenter } from "@/lib/ai-growth/coachActionCenterEngine";
import { buildCoachAlerts } from "@/lib/ai-growth/coachAlertEngine";
import { buildCoachDashboard } from "@/lib/ai-growth/coachDashboardEngine";
import { buildCoachTrainingPlanner } from "@/lib/ai-growth/coachTrainingPlannerEngine";

export type TeamGrowthIntelligenceInput = {
  teamName: string;
  roster: Array<{ playerId: string; displayName: string }>;
  avatars: Array<{
    playerId: string;
    playerName: string;
    avatar: PlayerGrowthAvatarDoc;
    timeline: PlayerGrowthTimeline | null;
    attendanceRatePct: number | null;
  }>;
};

function roundAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function buildSnapshot(
  rosterCount: number,
  rows: TeamPlayerGrowthRow[]
): TeamGrowthSnapshot {
  const avatars = rows.map((r) => r.avatar);
  const improvingCount = avatars.filter((a) => (a.weeklyDeltaOvr ?? 0) > 0).length;
  const decliningCount = avatars.filter((a) => (a.weeklyDeltaOvr ?? 0) < 0).length;

  return {
    rosterCount,
    trackedCount: rows.length,
    avgOvr: roundAvg(avatars.map((a) => a.ovr)),
    avgLevel: roundAvg(avatars.map((a) => a.level)),
    improvingCount,
    decliningCount,
    recoveryRiskCount: rows.filter((r) => r.risks.some((x) => x.type === "RECOVERY_LOW")).length,
    stagnationCount: rows.filter((r) => r.risks.some((x) => x.type === "STAGNATION")).length,
    attendanceRiskCount: rows.filter((r) => r.risks.some((x) => x.type === "ATTENDANCE_LOW")).length,
  };
}

function buildCoachRecommendations(rows: TeamPlayerGrowthRow[]): TeamCoachRecommendation[] {
  const out: TeamCoachRecommendation[] = [];
  let priority = 1;

  const recoveryPlayers = rows.filter((r) => r.risks.some((x) => x.type === "RECOVERY_LOW"));
  if (recoveryPlayers.length > 0) {
    const names = recoveryPlayers.map((r) => r.playerName);
    out.push({
      id: "team-recovery-focus",
      priority: priority++,
      emoji: "🎯",
      title: "회복(Recovery) 훈련 비중 증가",
      detail: `${recoveryPlayers.length}명의 Recovery가 목표(80) 미만입니다.`,
      affectedPlayerNames: names,
    });
  }

  const declinePlayers = rows.filter((r) => r.risks.some((x) => x.type === "DECLINE"));
  if (declinePlayers.length > 0) {
    const names = declinePlayers.map((r) => r.playerName);
    out.push({
      id: "team-decline-review",
      priority: priority++,
      emoji: "📉",
      title: "성장 하락 선수 개별 코칭",
      detail: `${declinePlayers.length}명의 최근 OVR이 하락했습니다.`,
      affectedPlayerNames: names,
    });
  }

  const stagnationPlayers = rows.filter((r) => r.risks.some((x) => x.type === "STAGNATION"));
  if (stagnationPlayers.length > 0) {
    const names = stagnationPlayers.map((r) => r.playerName);
    out.push({
      id: "team-stagnation-adjust",
      priority: priority++,
      emoji: "📊",
      title: "성장 정체 구간 — 훈련 난이도 조정",
      detail: `${stagnationPlayers.length}명이 최근 5회 성장 변화가 없습니다.`,
      affectedPlayerNames: names,
    });
  }

  const attendancePlayers = rows.filter((r) => r.risks.some((x) => x.type === "ATTENDANCE_LOW"));
  if (attendancePlayers.length > 0) {
    const names = attendancePlayers.map((r) => r.playerName);
    out.push({
      id: "team-attendance-followup",
      priority: priority++,
      emoji: "📅",
      title: "출석률 관리 필요",
      detail: `${attendancePlayers.length}명의 최근 출석률이 낮습니다.`,
      affectedPlayerNames: names,
    });
  }

  if (out.length === 0 && rows.length > 0) {
    out.push({
      id: "team-maintain-momentum",
      priority: 1,
      emoji: "✅",
      title: "현재 성장 추세 유지",
      detail: "팀 전체 위험 신호가 없습니다. 현재 훈련 페이스를 유지하세요.",
      affectedPlayerNames: [],
    });
  }

  return out.slice(0, 5);
}

function buildTeamAiSummary(
  teamName: string,
  snapshot: TeamGrowthSnapshot,
  atRiskPlayers: TeamPlayerGrowthRow[],
  coachRecommendations: TeamCoachRecommendation[]
): TeamGrowthAiSummary {
  const name = teamName.trim() || "팀";
  const paragraphs: string[] = [];

  if (snapshot.trackedCount === 0) {
    paragraphs.push(
      `${name}에는 아직 코치 검증 성장 데이터가 저장된 선수가 없습니다.`,
      "Step5에서 훈련 리포트를 저장하면 팀 성장 인텔리전스가 자동 생성됩니다."
    );
    const fullText = paragraphs.join("\n\n");
    return { paragraphs, fullText };
  }

  paragraphs.push(
    `${name}은(는) 등록 선수 ${snapshot.rosterCount}명 중 ${snapshot.trackedCount}명이 성장 추적 중입니다.`,
    `팀 평균 OVR ${snapshot.avgOvr} · 평균 Level ${snapshot.avgLevel}입니다.`
  );

  if (snapshot.improvingCount > 0 || snapshot.decliningCount > 0) {
    const parts: string[] = [];
    if (snapshot.improvingCount > 0) parts.push(`상승 ${snapshot.improvingCount}명`);
    if (snapshot.decliningCount > 0) parts.push(`하락 ${snapshot.decliningCount}명`);
    paragraphs.push(`최근 훈련 기준 OVR 변화: ${parts.join(", ")}.`);
  }

  if (atRiskPlayers.length > 0) {
    const top = atRiskPlayers.slice(0, 3);
    const riskSummary = top
      .map((p) => {
        const primary = p.risks[0];
        return primary ? `${p.playerName}(${primary.title})` : p.playerName;
      })
      .join(", ");
    paragraphs.push(`우선 점검 대상 ${atRiskPlayers.length}명: ${riskSummary}.`);
  } else {
    paragraphs.push("팀 전체에 즉시 대응이 필요한 성장 위험 신호는 없습니다.");
  }

  const primaryRec = coachRecommendations[0];
  if (primaryRec && primaryRec.id !== "team-maintain-momentum") {
    paragraphs.push(`코치 권장: ${primaryRec.title} — ${primaryRec.detail}`);
  }

  const fullText = paragraphs.join("\n\n");
  return { paragraphs, fullText };
}

/** Sprint E-1 — Avatar + Risk + Recommendation → 팀 단위 코치 인텔리전스 */
export function buildTeamGrowthIntelligence(
  input: TeamGrowthIntelligenceInput
): TeamGrowthIntelligenceResult {
  const rows: TeamPlayerGrowthRow[] = input.avatars.map((entry) => {
    const analysis = analyzeGrowthRisks({
      avatar: entry.avatar,
      timeline: entry.timeline,
      attendanceRatePct: entry.attendanceRatePct,
    });
    return {
      playerId: entry.playerId,
      playerName: entry.playerName || entry.avatar.playerName,
      avatar: entry.avatar,
      risks: analysis.risks,
      recommendations: analysis.recommendations,
    };
  });

  rows.sort((a, b) => {
    if (a.risks.length !== b.risks.length) return b.risks.length - a.risks.length;
    return a.playerName.localeCompare(b.playerName, "ko");
  });

  const atRiskPlayers = rows.filter((r) => r.risks.length > 0);
  const snapshot = buildSnapshot(input.roster.length, rows);
  const coachRecommendations = buildCoachRecommendations(rows);
  const weeklyDigest =
    rows.length > 0
      ? buildTeamWeeklyDigest({
          teamName: input.teamName,
          snapshot,
          players: rows,
          atRiskPlayers,
          coachRecommendations,
          avatars: input.avatars.map((a) => ({
            playerId: a.playerId,
            playerName: a.playerName,
            avatar: a.avatar,
            timeline: a.timeline,
          })),
        })
      : null;
  const aiSummary = buildTeamAiSummary(
    input.teamName,
    snapshot,
    atRiskPlayers,
    coachRecommendations
  );
  const teamSummary = buildTeamGrowthSummary({
    teamName: input.teamName,
    snapshot,
    weeklyDigest,
    atRiskPlayers,
    coachRecommendations,
    aiSummary,
    avatars: input.avatars.map((a) => ({
      playerId: a.playerId,
      playerName: a.playerName,
      avatar: a.avatar,
      timeline: a.timeline,
      attendanceRatePct: a.attendanceRatePct,
    })),
  });
  const coachActionCenter = buildCoachActionCenter({
    atRiskPlayers,
    coachRecommendations,
    players: rows,
  });
  const coachTrainingPlanner = buildCoachTrainingPlanner({
    atRiskPlayers,
    coachRecommendations,
    players: rows,
  });
  const coachAlerts = buildCoachAlerts(rows);
  const coachDashboard = buildCoachDashboard({
    atRiskPlayers,
    coachRecommendations,
    coachActionCenter,
    coachAlerts,
  });

  return {
    snapshot,
    players: rows,
    atRiskPlayers,
    weeklyDigest,
    teamSummary,
    coachActionCenter,
    coachTrainingPlanner,
    coachAlerts,
    coachDashboard,
    coachRecommendations,
    aiSummary,
  };
}
