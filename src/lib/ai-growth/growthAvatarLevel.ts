/** Sprint D-3 — OVR → parent-facing Level (1–5) */
export type GrowthAvatarLevel = 1 | 2 | 3 | 4 | 5;

const LEVEL_BANDS: { min: number; level: GrowthAvatarLevel }[] = [
  { min: 90, level: 5 },
  { min: 85, level: 4 },
  { min: 80, level: 3 },
  { min: 75, level: 2 },
  { min: 70, level: 1 },
];

export function ovrToGrowthLevel(ovr: number): GrowthAvatarLevel {
  const rounded = Math.round(ovr);
  for (const band of LEVEL_BANDS) {
    if (rounded >= band.min) return band.level;
  }
  return 1;
}

export function growthLevelLabel(level: GrowthAvatarLevel): string {
  return `Level ${level}`;
}
