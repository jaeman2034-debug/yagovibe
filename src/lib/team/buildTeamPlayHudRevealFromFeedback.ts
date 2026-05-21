import type { TeamPlayHudRevealDetail } from "@/lib/team/teamPlayHudEvents";
import type { PersistedPlayFeedbackMood, PlayFeedbackSubmitSummary } from "@/types/playMatchFeedback";
import { calculateLevel, PLAY_STAT_KEYS, PLAY_STAT_LABELS_KO, type PlayRecentGrowth } from "@/utils/playerStats";

const CONDITION_KO: Record<PersistedPlayFeedbackMood, string> = {
  good: "좋음",
  normal: "보통",
  bad: "아쉬움",
};

/** EXP 루프(v1): 레벨당 100 EXP 구간 — HUD XP 바와 동일 체감 */
function expBandForHud(exp: number): { level: number; xpCurrent: number; xpToNext: number } {
  const x = Math.max(0, Math.floor(Number(exp) || 0));
  const level = calculateLevel(x);
  const bandStart = (level - 1) * 100;
  const xpInto = x - bandStart;
  const xpToNext = 100;
  if (level >= 99) {
    return { level, xpCurrent: Math.min(99, xpInto % 100), xpToNext };
  }
  return { level, xpCurrent: Math.min(99, Math.max(0, xpInto)), xpToNext };
}

function momentumLine(summary: PlayFeedbackSubmitSummary): string {
  if (summary.nextLevel > summary.prevLevel) {
    return `⭐ Lv.${summary.prevLevel} → Lv.${summary.nextLevel} 레벨 업`;
  }
  const d = summary.nextOvr - summary.prevOvr;
  if (d > 0) {
    return `⬆ 이번 경기 후 OVR +${d}`;
  }
  if (d < 0) {
    return "이번 경기 후 OVR 조정 반영";
  }
  const g = summary.growth;
  const ups = PLAY_STAT_KEYS.filter((k) => (g[k] ?? 0) > 0);
  if (ups.length === 0) {
    return "이번 경기 피드백이 반영됐어요";
  }
  if (ups.length <= 2) {
    return ups.map((k) => `${PLAY_STAT_LABELS_KO[k]}+`).join(" · ") + " 성장";
  }
  return "여러 능력치가 이번 경기로 올랐어요";
}

function recentGrowthLine(growth: PlayRecentGrowth): string {
  const parts: string[] = [];
  for (const k of PLAY_STAT_KEYS) {
    const v = growth[k];
    if (v === undefined || v === 0) continue;
    const sign = v > 0 ? "+" : "";
    parts.push(`${PLAY_STAT_LABELS_KO[k]} ${sign}${v}`);
  }
  if (parts.length === 0) return "폼 유지";
  return parts.slice(0, 4).join(" · ");
}

/**
 * 경기 피드백 트랜잭션 성공 직후 — `dispatchTeamPlayHudReveal`에 넘길 HUD partial 생성
 * (실패 시 호출하지 말 것)
 * 연출 순서(XP 플로트 → HUD 코어 → 레벨업 버스트)는 `useTeamPlayHudReveal` 타이밍이 담당
 */
export function buildTeamPlayHudRevealFromFeedbackSummary(
  summary: PlayFeedbackSubmitSummary,
  options?: { recentMatchLine?: string }
): TeamPlayHudRevealDetail {
  const { level, xpCurrent, xpToNext } = expBandForHud(summary.nextExp);
  const ovrDelta = summary.nextOvr - summary.prevOvr;
  const matchCtx = options?.recentMatchLine?.trim();
  const levelUp =
    summary.nextLevel > summary.prevLevel
      ? { fromLevel: summary.prevLevel, toLevel: summary.nextLevel }
      : undefined;

  return {
    ovr: summary.nextOvr,
    ovrDelta,
    ovrMomentumLabel: momentumLine(summary),
    level,
    xpCurrent,
    xpToNext,
    recentMatchLine: matchCtx || recentGrowthLine(summary.growth),
    lastMatchContextLine: matchCtx ? `📅 ${matchCtx}` : "",
    conditionLabel: CONDITION_KO[summary.moodPersisted],
    xpGainRecent: Math.max(0, summary.expDelta),
    ...(levelUp ? { levelUpBurst: levelUp } : {}),
  };
}
