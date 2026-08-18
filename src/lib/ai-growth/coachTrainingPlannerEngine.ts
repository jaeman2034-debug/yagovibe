import type {
  CoachTrainingPlannerResult,
  TrainingPlanDay,
  TrainingPlanDayKey,
  TrainingPlanIntensity,
  TrainingPlanTheme,
} from "@/lib/ai-growth/coachTrainingPlannerTypes";
import type {
  TeamCoachRecommendation,
  TeamPlayerGrowthRow,
} from "@/lib/ai-growth/teamGrowthIntelligenceTypes";

const DAY_META: Array<{ dayKey: TrainingPlanDayKey; dayLabel: string }> = [
  { dayKey: "mon", dayLabel: "월" },
  { dayKey: "wed", dayLabel: "수" },
  { dayKey: "fri", dayLabel: "금" },
];

const THEME_LABEL: Record<TrainingPlanTheme, string> = {
  recovery: "Recovery",
  transition: "Transition",
  vision: "Vision",
  pressure: "Pressure",
  mixed: "혼합",
  maintenance: "유지",
};

const INTENSITY_LABEL: Record<TrainingPlanIntensity, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

function themeIntensity(theme: TrainingPlanTheme): TrainingPlanIntensity {
  if (theme === "recovery") return "low";
  if (theme === "transition" || theme === "mixed") return "medium";
  if (theme === "maintenance") return "low";
  return "medium";
}

function hasTransitionHint(player: TeamPlayerGrowthRow): boolean {
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

function dominantThemes(
  atRiskPlayers: TeamPlayerGrowthRow[],
  players: TeamPlayerGrowthRow[]
): TrainingPlanTheme[] {
  const themes: TrainingPlanTheme[] = [];
  const sample = atRiskPlayers[0] ?? players[0];
  if (!sample) return ["maintenance"];

  const recoveryRisk = atRiskPlayers.some((p) =>
    p.risks.some((r) => r.type === "RECOVERY_LOW")
  );
  if (recoveryRisk || sample.avatar.recovery < 80) {
    themes.push("recovery");
  }

  if (players.some(hasTransitionHint)) {
    themes.push("transition");
  } else if (sample.avatar.pressure >= 85) {
    themes.push("pressure");
  } else if (sample.avatar.vision >= sample.avatar.pressure) {
    themes.push("vision");
  }

  if (themes.length === 0) themes.push("maintenance");
  return themes;
}

function buildDay(
  meta: (typeof DAY_META)[number],
  theme: TrainingPlanTheme,
  detail: string | null
): TrainingPlanDay {
  const intensity = themeIntensity(theme);
  return {
    dayKey: meta.dayKey,
    dayLabel: meta.dayLabel,
    theme,
    themeLabel: THEME_LABEL[theme],
    intensity,
    detail: detail ?? `강도 ${INTENSITY_LABEL[intensity]}`,
  };
}

/** Sprint E-2.2 — D-5 추천 + E-1 위험 → 주간 훈련 계획 */
export function buildCoachTrainingPlanner(input: {
  atRiskPlayers: TeamPlayerGrowthRow[];
  coachRecommendations: TeamCoachRecommendation[];
  players: TeamPlayerGrowthRow[];
}): CoachTrainingPlannerResult {
  const { atRiskPlayers, coachRecommendations, players } = input;

  if (players.length === 0) {
    return {
      headline: "이번 주 훈련 계획",
      subline: "추적 선수가 없습니다.",
      days: [],
    };
  }

  const themes = dominantThemes(atRiskPlayers, players);
  const primary = themes[0] ?? "maintenance";
  const secondary = themes[1] ?? primary;

  const recoveryRec = coachRecommendations.find((r) => r.id === "team-recovery-focus");
  const recoveryDetail = recoveryRec
    ? `${recoveryRec.affectedPlayerNames.length}명 Recovery 집중`
    : null;

  const days: TrainingPlanDay[] = [
    buildDay(DAY_META[0]!, primary, primary === "recovery" ? recoveryDetail : null),
    buildDay(
      DAY_META[1]!,
      secondary !== primary ? secondary : primary === "recovery" ? "transition" : secondary,
      null
    ),
    buildDay(DAY_META[2]!, primary, primary === "recovery" ? "회복 마무리 · 가벼운 러닝" : null),
  ];

  const subline =
    atRiskPlayers.length > 0
      ? `위험 선수 ${atRiskPlayers.length}명 반영 · D-5 추천 기반`
      : "팀 추세 유지 — 기본 커리큘럼";

  return {
    headline: "이번 주 훈련 계획",
    subline,
    days,
  };
}
