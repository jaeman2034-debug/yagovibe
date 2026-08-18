import type {
  AcademyDashboardResult,
  AcademyDashboardSnapshot,
} from "@/lib/ai-growth/academyDashboardTypes";
import type { TeamGrowthIntelligenceResult } from "@/lib/ai-growth/teamGrowthIntelligenceTypes";

export type AcademyDashboardInput = {
  teamName: string;
  rosterCount: number;
  activeGuardianCount: number;
  teamIntelligence: TeamGrowthIntelligenceResult;
  /** F-1 multi-team 확장용 — 파일럿 기본 1 */
  teamCount?: number;
};

/** Sprint F-1.1 — E-1 팀 인텔리전스 + 명단·보호자 링크 → 아카데미 대시보드 */
export function buildAcademyDashboard(input: AcademyDashboardInput): AcademyDashboardResult {
  const { teamName, rosterCount, activeGuardianCount, teamIntelligence } = input;
  const teamCount = input.teamCount ?? 1;
  const { snapshot, atRiskPlayers } = teamIntelligence;

  const dash: AcademyDashboardSnapshot = {
    totalPlayers: rosterCount,
    trackedPlayers: snapshot.trackedCount,
    avgOvr: snapshot.avgOvr,
    avgLevel: snapshot.avgLevel,
    atRiskCount: atRiskPlayers.length,
    activeGuardianCount,
    teamCount,
  };

  const name = teamName.trim() || "아카데미";
  const subline =
    snapshot.trackedCount > 0
      ? `추적 ${snapshot.trackedCount}/${rosterCount}명 · 팀 ${teamCount}개`
      : "성장 데이터 대기 중";

  return {
    headline: name,
    subline,
    snapshot: dash,
  };
}
