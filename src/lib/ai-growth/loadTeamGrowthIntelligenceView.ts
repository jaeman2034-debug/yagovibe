import { buildAcademyAttendanceIntelligence } from "@/lib/ai-growth/academyAttendanceIntelligenceEngine";
import { buildAcademyCoachOperations } from "@/lib/ai-growth/academyCoachOperationsEngine";
import { buildAcademyCoachPerformance } from "@/lib/ai-growth/academyCoachPerformanceEngine";
import { buildAcademyDashboard } from "@/lib/ai-growth/academyDashboardEngine";
import { buildAcademySessionIntelligence } from "@/lib/ai-growth/academySessionIntelligenceEngine";
import { buildAcademyWeeklyDigest } from "@/lib/ai-growth/academyWeeklyDigestEngine";
import { getPlayerGrowthTimeline } from "@/lib/ai-growth/getPlayerGrowthTimeline";
import { loadAcademyAttendanceForPlayers } from "@/lib/ai-growth/loadAcademyAttendanceForPlayers";
import { loadAcademySessionIntelligenceInput } from "@/lib/ai-growth/loadAcademySessionIntelligenceInput";
import { loadPlayerAttendanceRatePct } from "@/lib/ai-growth/playerAttendanceRateRead";
import { loadPlayerGrowthAvatarsByPlayerIds } from "@/lib/ai-growth/playerGrowthAvatarService";
import { buildTeamGrowthIntelligence } from "@/lib/ai-growth/teamGrowthIntelligenceEngine";
import { readAcademyPlayers } from "@/lib/team/academyPlayersRead";
import { readParentLinksForTeam } from "@/lib/team/parentLinksRead";
import { readCoaches } from "@/lib/team/teamMemberRead";
import type {
  TeamGrowthIntelligenceEmptyReason,
  TeamGrowthIntelligenceView,
} from "@/lib/ai-growth/teamGrowthIntelligenceViewTypes";

function countActiveGuardians(links: Awaited<ReturnType<typeof readParentLinksForTeam>>): number {
  const uids = new Set<string>();
  for (const link of links) {
    if (link.status === "active" && link.parentUid) {
      uids.add(link.parentUid);
    }
  }
  return uids.size;
}

function withAcademyLayer(
  teamName: string,
  rosterCount: number,
  activeGuardianCount: number,
  intelligence: ReturnType<typeof buildTeamGrowthIntelligence>,
  teamId: string,
  coaches: Array<{ coachId: string; coachName: string }>,
  attendancePlayers: Awaited<ReturnType<typeof loadAcademyAttendanceForPlayers>>,
  sessionInput: Awaited<ReturnType<typeof loadAcademySessionIntelligenceInput>>
): TeamGrowthIntelligenceView {
  const academyAttendanceIntelligence = buildAcademyAttendanceIntelligence({
    academyName: teamName,
    players: attendancePlayers,
  });
  const academySessionIntelligence = buildAcademySessionIntelligence({
    academyName: teamName,
    rosterPlayerIds: sessionInput.rosterPlayerIds,
    sessions: sessionInput.sessions,
  });
  const academyCoachOperations = buildAcademyCoachOperations({
    academyName: teamName,
    coaches,
    rosterPlayerIds: sessionInput.rosterPlayerIds,
    sessions: sessionInput.sessions,
    attendanceAtRiskPlayers: academyAttendanceIntelligence?.atRiskPlayers ?? [],
    teamIntelligence: intelligence,
  });

  return {
    ...intelligence,
    teamId,
    teamName,
    academyDashboard: buildAcademyDashboard({
      teamName,
      rosterCount,
      activeGuardianCount,
      teamIntelligence: intelligence,
    }),
    academyWeeklyDigest: buildAcademyWeeklyDigest({
      academyName: teamName,
      teamIntelligence: intelligence,
      attendanceDigest: academyAttendanceIntelligence?.digest ?? null,
    }),
    academyCoachPerformance: buildAcademyCoachPerformance({
      academyName: teamName,
      coaches,
      teamIntelligence: intelligence,
    }),
    academyAttendanceIntelligence,
    academySessionIntelligence,
    academyCoachOperations,
  };
}

/** teams/{teamId} → E/F 레이어 포함 TeamGrowthIntelligenceView (read-only) */
export async function loadTeamGrowthIntelligenceView(
  teamId: string,
  teamName: string
): Promise<{
  view: TeamGrowthIntelligenceView | null;
  emptyReason: TeamGrowthIntelligenceEmptyReason | null;
}> {
  const tid = teamId.trim();
  if (!tid) {
    return { view: null, emptyReason: "no_roster" };
  }

  try {
    const [roster, parentLinks, coaches] = await Promise.all([
      readAcademyPlayers(tid),
      readParentLinksForTeam(tid).catch(() => []),
      readCoaches(tid).catch(() => []),
    ]);
    const activeGuardianCount = countActiveGuardians(parentLinks);
    const activeRoster = roster.filter((player) => player.status !== "archived");
    const coachRefs = coaches.map((coach) => ({
      coachId: coach.billingUid || coach.memberDocumentId,
      coachName: coach.displayName,
    }));

    if (activeRoster.length === 0) {
      return { view: null, emptyReason: "no_roster" };
    }

    const attendancePlayers = await loadAcademyAttendanceForPlayers(
      tid,
      activeRoster.map((player) => ({
        playerId: player.playerId,
        displayName: player.displayName,
      }))
    );
    const sessionInput = await loadAcademySessionIntelligenceInput(
      tid,
      activeRoster.map((player) => player.playerId)
    );
    const avatarMap = await loadPlayerGrowthAvatarsByPlayerIds(
      tid,
      activeRoster.map((player) => player.playerId)
    );
    const tracked = activeRoster.filter((player) => avatarMap[player.playerId]);

    if (tracked.length === 0) {
      const empty = buildTeamGrowthIntelligence({
        teamName,
        roster: activeRoster,
        avatars: [],
      });
      return {
        view: withAcademyLayer(
          teamName,
          activeRoster.length,
          activeGuardianCount,
          empty,
          tid,
          coachRefs,
          attendancePlayers,
          sessionInput
        ),
        emptyReason: "no_tracked_players",
      };
    }

    const avatars = await Promise.all(
      tracked.map(async (row) => {
        const avatar = avatarMap[row.playerId]!;
        const [timeline, attendanceRatePct] = await Promise.all([
          getPlayerGrowthTimeline(tid, row.playerId, 5).catch(() => null),
          loadPlayerAttendanceRatePct(tid, row.playerId).catch(() => null),
        ]);
        return {
          playerId: row.playerId,
          playerName: row.displayName || avatar.playerName,
          avatar,
          timeline,
          attendanceRatePct,
        };
      })
    );

    const result = buildTeamGrowthIntelligence({
      teamName,
      roster: activeRoster,
      avatars,
    });

    return {
      view: withAcademyLayer(
        teamName,
        activeRoster.length,
        activeGuardianCount,
        result,
        tid,
        coachRefs,
        attendancePlayers,
        sessionInput
      ),
      emptyReason: null,
    };
  } catch (error) {
    console.warn("[loadTeamGrowthIntelligenceView]", error);
    return { view: null, emptyReason: "load_error" };
  }
}
