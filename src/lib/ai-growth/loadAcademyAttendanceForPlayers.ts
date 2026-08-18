import { readAttendanceForSession } from "@/lib/academy/academyAttendanceRead";
import { readAcademySessionsForTeam } from "@/lib/academy/academySessionRead";
import type { PlayerSessionAttendance } from "@/lib/ai-growth/academyAttendanceMetrics";

function sessionStartsAtMs(startsAt: unknown): number {
  if (typeof startsAt === "number" && Number.isFinite(startsAt)) return startsAt;
  if (startsAt && typeof startsAt === "object" && "toMillis" in startsAt) {
    return (startsAt as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/** teams/{teamId}/sessions + attendance → F-2.1 엔진 입력 */
export async function loadAcademyAttendanceForPlayers(
  teamId: string,
  players: Array<{ playerId: string; displayName: string }>,
  maxSessions = 8
): Promise<
  Array<{
    playerId: string;
    playerName: string;
    sessions: PlayerSessionAttendance[];
  }>
> {
  if (!teamId.trim() || players.length === 0) return [];

  try {
    const sessions = await readAcademySessionsForTeam(teamId);
    const eligible = sessions
      .filter((session) => session.status !== "cancelled")
      .sort((a, b) => sessionStartsAtMs(b.startsAt) - sessionStartsAtMs(a.startsAt))
      .slice(0, maxSessions);

    if (eligible.length === 0) {
      return players.map((player) => ({
        playerId: player.playerId,
        playerName: player.displayName,
        sessions: [],
      }));
    }

    const rowsBySession = await Promise.all(
      eligible.map(async (session) => ({
        sessionId: session.sessionId,
        startsAtMs: sessionStartsAtMs(session.startsAt),
        rows: await readAttendanceForSession(teamId, session.sessionId).catch(() => []),
      }))
    );

    return players.map((player) => {
      const sessionRows: PlayerSessionAttendance[] = [];
      for (const session of rowsBySession) {
        const row = session.rows.find((entry) => entry.targetUid === player.playerId);
        if (!row) continue;
        sessionRows.push({
          sessionId: session.sessionId,
          startsAtMs: session.startsAtMs,
          status: row.status,
        });
      }
      return {
        playerId: player.playerId,
        playerName: player.displayName,
        sessions: sessionRows,
      };
    });
  } catch (error) {
    console.warn("[loadAcademyAttendanceForPlayers]", error);
    return [];
  }
}
