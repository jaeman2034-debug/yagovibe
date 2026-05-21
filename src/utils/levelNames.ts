/**
 * 🔥 레벨 명칭 시스템 (게임화)
 */

export interface LevelInfo {
  level: number;
  name: string;
  emoji: string;
  color: string;
  minScore: number;
  maxScore: number;
}

/** 서버 `XP_POLICY.LEVEL_XP_PER_LEVEL`(100)과 동일 분모 — 표시용 구간만 유지 */
export const LEVEL_NAMES: LevelInfo[] = [
  {
    level: 1,
    name: "새싹",
    emoji: "🌱",
    color: "#10b981",
    minScore: 0,
    maxScore: 99,
  },
  {
    level: 2,
    name: "활동가",
    emoji: "🔥",
    color: "#f59e0b",
    minScore: 100,
    maxScore: 199,
  },
  {
    level: 3,
    name: "핵심멤버",
    emoji: "💎",
    color: "#3b82f6",
    minScore: 200,
    maxScore: 399,
  },
  {
    level: 4,
    name: "리더",
    emoji: "⭐",
    color: "#8b5cf6",
    minScore: 400,
    maxScore: 799,
  },
  {
    level: 5,
    name: "전설",
    emoji: "👑",
    color: "#fbbf24",
    minScore: 800,
    maxScore: Infinity,
  },
];

/**
 * 점수로 레벨 정보 조회
 */
export function getLevelByScore(score: number): LevelInfo {
  const level = Math.floor(score / 100) + 1;
  
  // 레벨 범위 제한 (1~5)
  const clampedLevel = Math.min(Math.max(level, 1), 5);
  
  return LEVEL_NAMES[clampedLevel - 1] || LEVEL_NAMES[0];
}

/**
 * 레벨 표시 텍스트
 */
export function getLevelDisplay(score: number): string {
  const levelInfo = getLevelByScore(score);
  return `${levelInfo.emoji} ${levelInfo.name} Lv.${levelInfo.level}`;
}
