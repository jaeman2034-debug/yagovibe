import type {
  TeamCoachRecommendation,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";
import type {
  CoachActionCenterResult,
  CoachActionItem,
} from "@/lib/ai-growth/coachActionCenterTypes";
import type { GrowthRiskSignal, GrowthRiskType } from "@/lib/ai-growth/growthRiskTypes";

export type CoachActionCenterInput = {
  atRiskPlayers: TeamPlayerGrowthRow[];
  coachRecommendations: TeamCoachRecommendation[];
  players: TeamPlayerGrowthRow[];
};

const STAT_TRAINING_LABEL: Record<string, string> = {
  vision: "시야(Vision) 훈련",
  pressure: "압박 대응 훈련",
  recovery: "회복(Recovery) 훈련",
};

const COACH_ACTION_RISK_ORDER: GrowthRiskType[] = [
  "RECOVERY_LOW",
  "DECLINE",
  "STAGNATION",
  "ATTENDANCE_LOW",
];

function primaryCoachRisk(player: TeamPlayerGrowthRow): GrowthRiskSignal | undefined {
  for (const type of COACH_ACTION_RISK_ORDER) {
    const found = player.risks.find((r) => r.type === type);
    if (found) return found;
  }
  return player.risks[0];
}

function hasTransitionTrainingHint(player: TeamPlayerGrowthRow): boolean {
  const fromRecs = player.recommendations.some(
    (r) =>
      r.kind === "badge" &&
      (r.title.includes("Transition") ||
        r.title.includes("Playmaker") ||
        r.detail.includes("Transition"))
  );
  if (fromRecs) return true;
  return player.avatar.badges?.includes("transition_master") ?? false;
}

function playerPriorityAction(player: TeamPlayerGrowthRow, priority: number): CoachActionItem {
  const primaryRisk = primaryCoachRisk(player);
  const recovery = player.avatar.recovery;

  if (primaryRisk?.type === "RECOVERY_LOW") {
    return {
      id: `player-${player.playerId}-recovery`,
      priority,
      emoji: "🎯",
      title: player.playerName,
      detail: `Recovery 집중 — 현재 ${recovery}, 목표 80`,
      playerNames: [player.playerName],
    };
  }

  if (primaryRisk?.type === "DECLINE") {
    const delta = player.avatar.weeklyDeltaOvr ?? 0;
    const before = player.avatar.ovr - delta;
    return {
      id: `player-${player.playerId}-decline`,
      priority,
      emoji: "📉",
      title: player.playerName,
      detail: `개별 코칭 — OVR ${before} → ${player.avatar.ovr}`,
      playerNames: [player.playerName],
    };
  }

  if (primaryRisk?.type === "STAGNATION") {
    return {
      id: `player-${player.playerId}-stagnation`,
      priority,
      emoji: "📊",
      title: player.playerName,
      detail: "훈련 난이도 조정 — 성장 정체 구간",
      playerNames: [player.playerName],
    };
  }

  return {
    id: `player-${player.playerId}-check`,
    priority,
    emoji: "👤",
    title: player.playerName,
    detail: primaryRisk ? `${primaryRisk.title} — ${primaryRisk.body}` : "우선 점검",
    playerNames: [player.playerName],
  };
}

function teamTrainingAction(
  rec: TeamCoachRecommendation,
  priority: number
): CoachActionItem {
  if (rec.id === "team-recovery-focus") {
    return {
      id: "team-training-recovery",
      priority,
      emoji: "🏃",
      title: "회복(Recovery) 훈련",
      detail: "15분 추가 — 팀 Recovery 비중 확대",
      playerNames: rec.affectedPlayerNames,
    };
  }

  if (rec.id === "team-decline-review") {
    return {
      id: "team-training-decline",
      priority,
      emoji: "🗣️",
      title: "개별 코칭 세션",
      detail: "10분 1:1 피드백 — 성장 하락 선수",
      playerNames: rec.affectedPlayerNames,
    };
  }

  if (rec.id === "team-stagnation-adjust") {
    return {
      id: "team-training-stagnation",
      priority,
      emoji: "📈",
      title: "훈련 강도 조정",
      detail: "난이도 상향 또는 드릴 변경",
      playerNames: rec.affectedPlayerNames,
    };
  }

  return {
    id: `team-training-${rec.id}`,
    priority,
    emoji: rec.emoji,
    title: rec.title,
    detail: rec.detail,
    playerNames: rec.affectedPlayerNames,
  };
}

function supplementalPlayerAction(player: TeamPlayerGrowthRow, priority: number): CoachActionItem | null {
  if (hasTransitionTrainingHint(player)) {
    return {
      id: `supplement-${player.playerId}-transition`,
      priority,
      emoji: "⚡",
      title: "전환 훈련",
      detail: "강도 보통 — Transition Master 목표",
      playerNames: [player.playerName],
    };
  }

  const focusRec = player.recommendations.find((r) => r.kind === "training_focus");

  if (focusRec?.stat) {
    const label = STAT_TRAINING_LABEL[focusRec.stat] ?? focusRec.title;
    return {
      id: `supplement-${player.playerId}-${focusRec.stat}`,
      priority,
      emoji: focusRec.emoji,
      title: label,
      detail: "15분 추가 — 추천 엔진 기반",
      playerNames: [player.playerName],
    };
  }

  return null;
}

/** Sprint E-2.1 — E-1 Risk + D-5 Recommendation → 오늘 우선 코칭 */
export function buildCoachActionCenter(input: CoachActionCenterInput): CoachActionCenterResult {
  const { atRiskPlayers, coachRecommendations, players } = input;

  if (players.length === 0) {
    return {
      headline: "오늘 우선 코칭",
      subline: "추적 중인 선수가 없습니다.",
      actions: [],
    };
  }

  const actions: CoachActionItem[] = [];
  let priority = 1;

  const topPlayer = atRiskPlayers[0] ?? players[0];
  if (topPlayer) {
    actions.push(playerPriorityAction(topPlayer, priority++));
  }

  if (topPlayer && topPlayer.avatar.pressure >= 85) {
    actions.push({
      id: `team-pressure-${topPlayer.playerId}`,
      priority: priority++,
      emoji: "💪",
      title: "압박 대응 훈련",
      detail: "15분 추가 — 강점 유지",
      playerNames: [topPlayer.playerName],
    });
  }

  const supplement = topPlayer ? supplementalPlayerAction(topPlayer, priority) : null;
  if (supplement && !actions.some((a) => a.id === supplement.id)) {
    actions.push(supplement);
  } else if (actions.length < 3) {
    const teamRec = coachRecommendations.find((r) => r.id !== "team-maintain-momentum");
    if (teamRec && !actions.some((a) => a.id.startsWith("team-training-"))) {
      actions.push(teamTrainingAction(teamRec, priority++));
    }
  }

  if (actions.length === 0) {
    actions.push({
      id: "maintain-momentum",
      priority: 1,
      emoji: "✅",
      title: "현재 훈련 페이스 유지",
      detail: "팀 전체 위험 신호 없음 — 기존 커리큘럼 유지",
    });
  }

  const subline =
    atRiskPlayers.length > 0
      ? `오늘 조치 필요 ${atRiskPlayers.length}명 · 추천 ${actions.length}건`
      : `추적 선수 ${players.length}명 · 특별 조치 없음`;

  return {
    headline: "오늘 우선 코칭",
    subline,
    actions: actions.slice(0, 5),
  };
}
