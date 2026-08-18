import { readAttendanceForSession } from "@/lib/academy/academyAttendanceRead";
import { readAcademySessionsForTeam } from "@/lib/academy/academySessionRead";
import type { AcademySessionIntelligenceInput } from "@/lib/ai-growth/academySessionIntelligenceEngine";

function sessionStartsAtMs(startsAt: unknown): number {
  if (typeof startsAt === "number" && Number.isFinite(startsAt)) return startsAt;
  if (startsAt && typeof startsAt === "object" && "toMillis" in startsAt) {
    return (startsAt as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/** teams/{teamId}/sessions + attendance → F-2.2 엔진 입력 */
export async function loadAcademySessionIntelligenceInput(
  teamId: string,
  rosterPlayerIds: string[],
  maxSessions = 8
): Promise<AcademySessionIntelligenceInput> {
  if (!teamId.trim()) {
    return { academyName: "", rosterPlayerIds: [], sessions: [] };
  }

  try {
    const sessions = await readAcademySessionsForTeam(teamId, { limit: maxSessions });
    const recent = sessions
      .sort((a, b) => sessionStartsAtMs(b.startsAt) - sessionStartsAtMs(a.startsAt))
      .slice(0, maxSessions);

    const withAttendance = await Promise.all(
      recent.map(async (session) => ({
        sessionId: session.sessionId,
        title: session.title,
        startsAtMs: sessionStartsAtMs(session.startsAt),
        status: session.status,
        coachUid: session.coachUid,
        attendanceRows: (await readAttendanceForSession(teamId, session.sessionId).catch(() => [])).map(
          (row) => ({
            targetUid: row.targetUid,
            status: row.status,
          })
        ),
      }))
    );

    return {
      academyName: "",
      rosterPlayerIds,
      sessions: withAttendance,
    };
  } catch (error) {
    console.warn("[loadAcademySessionIntelligenceInput]", error);
    return { academyName: "", rosterPlayerIds, sessions: [] };
  }
}
