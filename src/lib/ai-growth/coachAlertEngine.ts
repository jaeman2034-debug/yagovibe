import type { CoachAlert, CoachAlertFeedResult } from "@/lib/ai-growth/coachAlertTypes";
import type { GrowthRiskSignal } from "@/lib/ai-growth/growthRiskTypes";
import type { TeamPlayerGrowthRow } from "@/lib/ai-growth/teamGrowthIntelligenceTypes";

function coachAlertTitle(playerName: string, risk: GrowthRiskSignal): string {
  switch (risk.type) {
    case "DECLINE":
      return `${playerName} 성장 하락`;
    case "RECOVERY_LOW":
      return `Recovery 80 미만 — ${playerName}`;
    case "STAGNATION":
      return `${playerName} 성장 정체`;
    case "ATTENDANCE_LOW":
      return `${playerName} 출석 부족`;
    default:
      return `${playerName} — ${risk.title}`;
  }
}

function coachAlertBody(risk: GrowthRiskSignal): string {
  if (risk.type === "STAGNATION") {
    return "최근 5회 연속 성장 변화 없음";
  }
  if (risk.type === "RECOVERY_LOW") {
    return risk.body;
  }
  if (risk.type === "DECLINE" && risk.detail) {
    return `OVR ${risk.detail.replace("OVR ", "")}`;
  }
  return risk.body;
}

function riskToAlert(player: TeamPlayerGrowthRow, risk: GrowthRiskSignal): CoachAlert {
  return {
    id: `coach-alert-${player.playerId}-${risk.type}`,
    type: risk.type,
    severity: risk.severity,
    emoji: risk.type === "RECOVERY_LOW" ? "⚠" : risk.emoji,
    title: coachAlertTitle(player.playerName, risk),
    body: coachAlertBody(risk),
    playerId: player.playerId,
    playerName: player.playerName,
  };
}

/** Sprint E-2.3 — 팀 위험 신호 → 코치 전용 알림 */
export function buildCoachAlerts(players: TeamPlayerGrowthRow[]): CoachAlertFeedResult {
  const alerts: CoachAlert[] = [];

  for (const player of players) {
    for (const risk of player.risks) {
      alerts.push(riskToAlert(player, risk));
    }
  }

  const priority = { DECLINE: 1, RECOVERY_LOW: 2, STAGNATION: 3, ATTENDANCE_LOW: 4 };
  alerts.sort((a, b) => priority[a.type] - priority[b.type]);

  return {
    headline: "코치 알림",
    alerts: alerts.slice(0, 8),
  };
}
