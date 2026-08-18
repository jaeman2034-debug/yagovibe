import {
  ACADEMY_ATTENDANCE_CONSECUTIVE_ABSENCE_THRESHOLD,
  ACADEMY_ATTENDANCE_RISK_THRESHOLD_PCT,
  type AcademyAttendanceRiskPlayer,
  type AcademyAttendanceRiskType,
} from "@/lib/ai-growth/academyAttendanceIntelligenceTypes";
import type { PlayerAttendanceMetrics } from "@/lib/ai-growth/academyAttendanceMetrics";

const COACH_ACTIONS = ["보호자 확인", "개별 연락", "훈련 일정 조정"] as const;

function riskLabel(type: AcademyAttendanceRiskType): string {
  switch (type) {
    case "LOW_RATE":
      return "출석 위험";
    case "CONSECUTIVE_ABSENCE":
      return "연속 결석";
    case "RECENT_DECLINE":
      return "최근 출석 급감";
  }
}

function detectRiskTypes(metrics: PlayerAttendanceMetrics): AcademyAttendanceRiskType[] {
  const types: AcademyAttendanceRiskType[] = [];

  if (metrics.attendanceRatePct < ACADEMY_ATTENDANCE_RISK_THRESHOLD_PCT) {
    types.push("LOW_RATE");
  }
  if (metrics.consecutiveAbsences >= ACADEMY_ATTENDANCE_CONSECUTIVE_ABSENCE_THRESHOLD) {
    types.push("CONSECUTIVE_ABSENCE");
  }
  if (metrics.recentDecline) {
    types.push("RECENT_DECLINE");
  }

  return types;
}

/** Sprint F-2.1-b — D-5 유사 출석 위험 감지 */
export function buildAcademyAttendanceRiskPlayers(
  players: PlayerAttendanceMetrics[]
): AcademyAttendanceRiskPlayer[] {
  const out: AcademyAttendanceRiskPlayer[] = [];

  for (const metrics of players) {
    const riskTypes = detectRiskTypes(metrics);
    if (riskTypes.length === 0) continue;

    out.push({
      playerId: metrics.playerId,
      playerName: metrics.playerName,
      attendanceRatePct: metrics.attendanceRatePct,
      lateRatePct: metrics.lateRatePct,
      absentRatePct: metrics.absentRatePct,
      consecutiveAbsences: metrics.consecutiveAbsences,
      riskTypes,
      riskLabels: riskTypes.map(riskLabel),
      recommendations: [...COACH_ACTIONS],
    });
  }

  out.sort((a, b) => a.attendanceRatePct - b.attendanceRatePct);
  return out;
}
