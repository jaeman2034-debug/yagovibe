import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { canViewAIGrowthValidationConsole } from "@/lib/academy/aiGrowthValidationSelectors";
import { loadTeamGrowthIntelligenceView } from "@/lib/ai-growth/loadTeamGrowthIntelligenceView";
import {
  buildMinimalAcademySnapshot,
  mapTeamGrowthViewToAcademySnapshot,
} from "@/lib/ai-growth/mapTeamGrowthViewToAcademySnapshot";
import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";
import { readAcademyPlayers } from "@/lib/team/academyPlayersRead";
import { normalizeMemberRole } from "@/lib/team/academyMemberRole";
import { isAcademyOrganization } from "@/lib/p0/terminology";

export type OperatedAcademyTeamRef = {
  teamId: string;
  teamName: string;
  role: string;
};

function memberActive(status: string | undefined): boolean {
  if (!status) return true;
  return status.trim().toLowerCase() === "active";
}

/** MVP A — 사용자가 운영/코치하는 academy 팀 목록 (read-only) */
export async function resolveOperatedAcademyTeams(
  memberships: Array<{ teamId: string; role?: string; status: string }>
): Promise<OperatedAcademyTeamRef[]> {
  const candidates = memberships.filter(
    (membership) =>
      membership.teamId &&
      memberActive(membership.status) &&
      canViewAIGrowthValidationConsole(normalizeMemberRole(membership.role))
  );

  const uniqueByTeam = new Map<string, OperatedAcademyTeamRef>();
  for (const membership of candidates) {
    if (uniqueByTeam.has(membership.teamId)) continue;
    uniqueByTeam.set(membership.teamId, {
      teamId: membership.teamId,
      teamName: membership.teamId,
      role: normalizeMemberRole(membership.role),
    });
  }

  const resolved: OperatedAcademyTeamRef[] = [];
  await Promise.all(
    [...uniqueByTeam.values()].map(async (ref) => {
      try {
        const snap = await getDoc(doc(db, "teams", ref.teamId));
        if (!snap.exists()) return;
        const data = snap.data();
        if (!isAcademyOrganization(data)) return;
        resolved.push({
          teamId: ref.teamId,
          teamName: String(data.name ?? ref.teamId),
          role: ref.role,
        });
      } catch (error) {
        console.warn("[resolveOperatedAcademyTeams]", ref.teamId, error);
      }
    })
  );

  return resolved.sort((a, b) => a.teamName.localeCompare(b.teamName, "ko"));
}

/** 운영 아카데미별 intelligence snapshot 로드 */
export async function loadAcademyIntelligenceSnapshots(
  teams: OperatedAcademyTeamRef[]
): Promise<AcademyIntelligenceSnapshot[]> {
  const snapshots = await Promise.all(
    teams.map(async (team) => {
      const { view } = await loadTeamGrowthIntelligenceView(team.teamId, team.teamName);
      if (view) {
        return mapTeamGrowthViewToAcademySnapshot(view);
      }

      const roster = await readAcademyPlayers(team.teamId).catch(() => []);
      const playerCount = roster.filter((player) => player.status !== "archived").length;
      return buildMinimalAcademySnapshot({
        teamId: team.teamId,
        teamName: team.teamName,
        playerCount,
      });
    })
  );

  return snapshots;
}
