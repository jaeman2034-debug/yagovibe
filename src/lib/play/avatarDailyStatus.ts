import { PLAY_STAT_KEYS, type PlayPlayerStatsDoc, type PlayRecentGrowth } from "@/utils/playerStats";

export type AvatarConditionTier = "good" | "mid" | "bad";

/** 최근 성장 합산 (스탯 변화 포인트 합) */
export function sumRecentGrowthPoints(recentGrowth: PlayRecentGrowth): number {
  let s = 0;
  for (const k of PLAY_STAT_KEYS) s += recentGrowth[k] ?? 0;
  return s;
}

/**
 * 컨디션: 최근 성장 + 체력/태도 기반 (카드 심리 몰입용 휴리스틱)
 */
export function deriveAvatarCondition(player: PlayPlayerStatsDoc): {
  tier: AvatarConditionTier;
  labelKo: string;
  arrow: "🔼" | "🔽" | "";
} {
  const net = sumRecentGrowthPoints(player.recentGrowth);
  const stamina = player.stats.stamina;
  const attitude = player.stats.attitude;
  const base = stamina + attitude;

  if (net >= 2 || (net >= 1 && base >= 7)) {
    return { tier: "good", labelKo: "좋음", arrow: net > 0 ? "🔼" : "" };
  }
  if (net <= -2 || base <= 4) {
    return { tier: "bad", labelKo: "나쁨", arrow: "🔽" };
  }
  return { tier: "mid", labelKo: "보통", arrow: "" };
}

export type ParticipationHint = {
  hasLinkedGame: boolean;
  quartersPlayed?: number;
  minutesPlayed?: number;
};

/** 출전 영향력 한 줄 */
export function participationInfluenceShort(h: ParticipationHint): { labelKo: string; tier: "high" | "mid" | "low" } {
  if (!h.hasLinkedGame) {
    return { labelKo: "연결 경기 없음 · 로스터 기준", tier: "mid" };
  }
  const min = h.minutesPlayed ?? 0;
  const q = h.quartersPlayed ?? 0;
  if (min >= 45 || q >= 4) return { labelKo: "높음", tier: "high" };
  if (min >= 20 || q >= 2) return { labelKo: "보통", tier: "mid" };
  if (min > 0 || q >= 1) return { labelKo: "낮음", tier: "low" };
  return { labelKo: "출전 기록 없음", tier: "low" };
}
