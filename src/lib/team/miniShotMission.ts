import type { MiniShotGoalZone } from "@/lib/team/miniShotZone";

export type MissionDifficulty = "easy" | "normal" | "hard";

export type TargetMissionTemplate = {
  targetZone: MiniShotGoalZone;
  requiredHits: number;
  reward: number;
  difficulty: MissionDifficulty;
};

export type TargetMission = TargetMissionTemplate & {
  currentHits: number;
};

const EASY_POOL: readonly TargetMissionTemplate[] = [
  { targetZone: { row: 1, col: 1 }, requiredHits: 1, reward: 25, difficulty: "easy" },
  { targetZone: { row: 1, col: 0 }, requiredHits: 1, reward: 30, difficulty: "easy" },
  { targetZone: { row: 1, col: 2 }, requiredHits: 1, reward: 30, difficulty: "easy" },
];

const NORMAL_POOL: readonly TargetMissionTemplate[] = [
  { targetZone: { row: 0, col: 1 }, requiredHits: 2, reward: 45, difficulty: "normal" },
  { targetZone: { row: 1, col: 0 }, requiredHits: 2, reward: 40, difficulty: "normal" },
  { targetZone: { row: 1, col: 2 }, requiredHits: 2, reward: 40, difficulty: "normal" },
];

const HARD_POOL: readonly TargetMissionTemplate[] = [
  { targetZone: { row: 0, col: 0 }, requiredHits: 2, reward: 55, difficulty: "hard" },
  { targetZone: { row: 0, col: 2 }, requiredHits: 2, reward: 55, difficulty: "hard" },
  { targetZone: { row: 0, col: 0 }, requiredHits: 3, reward: 75, difficulty: "hard" },
  { targetZone: { row: 0, col: 2 }, requiredHits: 3, reward: 75, difficulty: "hard" },
];

export function missionDifficultyByClears(clears: number): MissionDifficulty {
  if (clears < 3) return "easy";
  if (clears < 6) return "normal";
  return "hard";
}

function sameZone(a: MiniShotGoalZone, b: MiniShotGoalZone): boolean {
  return a.row === b.row && a.col === b.col;
}

export function buildTargetMission(
  clears: number,
  excludeZone?: MiniShotGoalZone
): TargetMission {
  const diff = missionDifficultyByClears(clears);
  const pool = diff === "easy" ? EASY_POOL : diff === "normal" ? NORMAL_POOL : HARD_POOL;
  const candidates = excludeZone ? pool.filter((m) => !sameZone(m.targetZone, excludeZone)) : pool;
  const picked = candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];
  return {
    ...picked,
    currentHits: 0,
  };
}

export function missionDifficultyLabelKo(d: MissionDifficulty): string {
  if (d === "easy") return "EASY";
  if (d === "normal") return "NORMAL";
  return "HARD";
}

