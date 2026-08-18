/** Sprint D-5.4-a — Growth Risk Detection registry */

export type GrowthRiskType = "STAGNATION" | "DECLINE" | "RECOVERY_LOW" | "ATTENDANCE_LOW";

export type GrowthRiskSeverity = "warning" | "caution";

export type GrowthRiskSignal = {
  id: string;
  type: GrowthRiskType;
  severity: GrowthRiskSeverity;
  emoji: string;
  title: string;
  body: string;
  detail?: string;
};

export const RECOVERY_RISK_THRESHOLD = 80;
export const ATTENDANCE_RISK_THRESHOLD_PCT = 70;
export const STAGNATION_MIN_POINTS = 5;

export function buildGrowthRiskId(type: GrowthRiskType): string {
  return `risk-${type.toLowerCase()}`;
}
