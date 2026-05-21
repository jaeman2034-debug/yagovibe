import * as THREE from "three";

export type MiniShotGoalZone = {
  /** 상단=0, 하단=1 */
  row: 0 | 1;
  /** 좌=0, 중=1, 우=2 */
  col: 0 | 1 | 2;
};

/** [row][col] 점수표 (상단 코너 고점) */
export const MINI_SHOT_ZONE_SCORE_TABLE: readonly [readonly [number, number, number], readonly [number, number, number]] = [
  [30, 15, 30],
  [20, 10, 20],
];

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

export function getGoalZone(ball: THREE.Vector3, goalBox: THREE.Box3): MiniShotGoalZone {
  const xDen = Math.max(1e-6, goalBox.max.x - goalBox.min.x);
  const yDen = Math.max(1e-6, goalBox.max.y - goalBox.min.y);
  const xRatio = clamp01((ball.x - goalBox.min.x) / xDen);
  const yRatio = clamp01((ball.y - goalBox.min.y) / yDen);
  const col: 0 | 1 | 2 = xRatio < 0.3333 ? 0 : xRatio < 0.6667 ? 1 : 2;
  const row: 0 | 1 = yRatio < 0.5 ? 1 : 0;
  return { row, col };
}

export function getZoneScore(zone: MiniShotGoalZone): number {
  return MINI_SHOT_ZONE_SCORE_TABLE[zone.row][zone.col];
}

export function getZoneLabel(zone: MiniShotGoalZone): string {
  if (zone.row === 0 && (zone.col === 0 || zone.col === 2)) return "TOP CORNER 🎯";
  if (zone.row === 0) return "TOP SHOT";
  if (zone.col === 1) return "CENTER";
  return "NICE SHOT";
}

