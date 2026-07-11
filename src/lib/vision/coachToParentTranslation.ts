/**
 * Vision v6-6 — Coach Intelligence → Parent Language (Persona Translation Layer)
 */

import type { PlayerIntelligenceView } from "@/lib/vision/playerIntelligenceTypes";

const TACTICAL_RECOMMENDATION_MAP: Record<string, string> = {
  "increase forward pressing":
    "이번 주에는 전방 압박을 조금 더 연습해 보세요.",
  "improve compactness":
    "팀과 함께 간격을 좁히며 움직이는 연습을 이어가면 좋겠습니다.",
  "increase forward pass rate":
    "전방으로 패스를 연결하는 훈련을 조금 더 늘려 보세요.",
  "improve ball progression":
    "공을 앞으로 전개하는 연습을 이어가면 다음 경기에 도움이 됩니다.",
  "maintain defensive shape":
    "수비 위치를 함께 맞추는 연습을 꾸준히 이어가면 좋겠습니다.",
  "increase pressing intensity":
    "적극적으로 공간을 압박하는 움직임을 조금 더 연습해 보세요.",
};

const STAT_STRONG = 85;
const FII_HIGH = 75;
const FII_LOW = 50;

function normalizeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Coach tactical phrase → single parent action sentence */
export function translateTacticalRecommendation(raw: string | null | undefined): string | null {
  const text = raw?.trim();
  if (!text) return null;

  const mapped = TACTICAL_RECOMMENDATION_MAP[normalizeKey(text)];
  if (mapped) return mapped;

  if (/forward press/i.test(text)) {
    return "이번 주에는 전방 압박을 조금 더 연습해 보세요.";
  }
  if (/compact/i.test(text)) {
    return "팀과 함께 간격을 좁히며 움직이는 연습을 이어가면 좋겠습니다.";
  }
  if (/pass/i.test(text)) {
    return "패스 연결과 공간 찾기를 조금 더 연습하면 좋겠습니다.";
  }
  if (/press/i.test(text)) {
    return "적극적으로 공간을 활용하는 움직임을 이어가면 좋겠습니다.";
  }

  if (/[가-힣]/.test(text)) {
    const cleaned = text.replace(/\.$/, "");
    if (cleaned.endsWith("세요") || cleaned.endsWith("습니다") || cleaned.endsWith("요")) {
      return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
    }
    return `${cleaned}을(를) 조금 더 연습해 보세요.`;
  }

  return "꾸준한 훈련 참여를 이어가면 다음 경기에서 성장을 확인할 수 있습니다.";
}

export function translatePlaymakerContribution(
  view: PlayerIntelligenceView,
  playerName: string
): string {
  if (view.playmaker.isPlaymaker) {
    return `${playerName} 선수가 경기 연결에 큰 기여를 했습니다.`;
  }
  if (view.vision.hasAnalysis && view.playmaker.contributionLabel.includes("다른")) {
    return "팀 공격 흐름에 맞춰 플레이하려는 노력이 보였습니다.";
  }
  return `${playerName} 선수의 패스 연결과 공간 찾기를 조금 더 연습하면 좋겠습니다.`;
}

export function translateCompactnessContext(compactness: number | null): string | null {
  if (compactness == null) return null;
  if (compactness >= 85) {
    return "팀이 조직적으로 잘 움직였고, 우리 아이도 그 흐름에 잘 맞춰 플레이했습니다.";
  }
  if (compactness >= 70) {
    return "팀과 함께 움직이며 경기 흐름에 잘 적응했습니다.";
  }
  return null;
}

export function translateMatchSummary(view: PlayerIntelligenceView, playerName: string): string {
  const tactical = view.vision.tacticalSummary?.trim();
  if (tactical && /[가-힣]/.test(tactical)) {
    return tactical;
  }

  const parts: string[] = [];
  if (view.vision.hasAnalysis) {
    parts.push(`이번 경기에서 ${playerName} 선수의 활약을 분석했습니다.`);
  }
  const compact = translateCompactnessContext(view.vision.compactness);
  if (compact) parts.push(compact);
  if (view.fii.score != null && view.fii.score >= FII_HIGH) {
    parts.push("경기 영향력이 높은 편이었습니다.");
  }

  return parts.length > 0
    ? parts.join(" ")
    : `${playerName} 선수의 성장을 꾸준히 응원해 주세요.`;
}

export function translateFiiHeadline(view: PlayerIntelligenceView, playerName: string): string {
  const score = view.fii.score;
  if (score == null) {
    return `${playerName} 선수의 경기·훈련 데이터를 바탕으로 성장을 추적하고 있습니다.`;
  }
  if (score >= FII_HIGH) {
    const rankNote =
      view.fii.rank != null ? `팀에서 두드러진 활약을 보였습니다.` : "경기 영향력이 높았습니다.";
    return `${playerName} 선수가 ${rankNote}`;
  }
  if (score >= FII_LOW) {
    return `${playerName} 선수가 경기에 꾸준히 참여하며 성장하고 있습니다.`;
  }
  return `${playerName} 선수의 경기 참여를 더 늘리면 다음 경기에서 성장 폭이 커질 수 있습니다.`;
}

/** Single parent action — priority: tactical → FII band → generic */
export function pickParentRecommendation(
  view: PlayerIntelligenceView,
  growthFocusArea?: string | null
): string {
  const fromTactical = translateTacticalRecommendation(view.recommendation);
  if (fromTactical && !fromTactical.includes("꾸준한 훈련 참여")) {
    return fromTactical;
  }

  const tacticalRaw = view.vision.tacticalSummary;
  const fromReport = translateTacticalRecommendation(tacticalRaw);
  if (fromReport && !fromReport.includes("꾸준한 훈련 참여")) {
    return fromReport;
  }

  if (growthFocusArea?.trim()) {
    const focus = growthFocusArea.trim().replace(/\.$/, "");
    return focus.endsWith("요") || focus.endsWith("세요") ? `${focus}.` : `${focus}.`;
  }

  const score = view.fii.score;
  if (score != null && score >= FII_HIGH) {
    return "다음 훈련에서도 팀과 연결하는 플레이를 이어가면 좋겠습니다.";
  }
  if (score != null && score < FII_LOW) {
    return "이번 주에는 패스 타이밍과 공간 찾기를 조금 더 연습해 보세요.";
  }
  if (!view.playmaker.isPlaymaker && view.vision.hasAnalysis) {
    return "이번 주에는 전방 움직임을 조금 더 연습해 보세요.";
  }

  return "꾸준한 훈련 참여를 이어가면 다음 경기에서 성장을 확인할 수 있습니다.";
}

/** One encouraging sentence for parents (Emotion Layer) */
export function buildEmotionSummary(
  view: PlayerIntelligenceView,
  playerName: string
): string {
  const name = playerName.trim() || "우리 아이";

  if (view.playmaker.isPlaymaker) {
    return `이번 경기에서 ${name}의 자신감 있는 연결 플레이가 많이 보였습니다.`;
  }

  const score = view.fii.score;
  if (score != null && score >= FII_HIGH) {
    return `이번 경기에서 ${name}의 자신감 있는 플레이가 많이 보였습니다.`;
  }

  const { visionStat, pressureStat, recoveryStat } = view.avatar;
  if (recoveryStat != null && recoveryStat >= STAT_STRONG) {
    return `${name}이(가) 끝까지 포기하지 않고 집중하는 좋은 모습을 보여주었습니다.`;
  }
  if (pressureStat != null && pressureStat >= STAT_STRONG) {
    return `압박 상황에서도 ${name}의 침착한 플레이가 인상적이었습니다.`;
  }
  if (visionStat != null && visionStat >= STAT_STRONG) {
    return `${name}이(가) 주변을 잘 살피며 성장하는 모습을 보여주었습니다.`;
  }

  if (score != null && score < FII_LOW) {
    return `${name}이(가) 어려운 순간에도 포기하지 않고 경기에 임하는 모습이 좋았습니다.`;
  }

  if (view.vision.hasAnalysis) {
    return `이번 경기에서 ${name}의 성실한 플레이가 눈에 띄었습니다.`;
  }

  return `${name}의 꾸준한 노력을 응원해 주세요.`;
}
