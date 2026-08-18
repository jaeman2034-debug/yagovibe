import { readAttendanceForSession } from "@/lib/academy/academyAttendanceRead";
import { readAcademySessionsForTeam } from "@/lib/academy/academySessionRead";

const ATTENDED = new Set(["present", "late"]);

function sessionStartsAtMs(startsAt: unknown): number {
  if (typeof startsAt === "number" && Number.isFinite(startsAt)) return startsAt;
  if (startsAt && typeof startsAt === "object" && "toMillis" in startsAt) {
    return (startsAt as { toMillis: () => number }).toMillis();
  }
  return 0;
}

/** 최근 N개 세션 기준 출석률 (present+late / 기록된 세션) */
export async function loadPlayerAttendanceRatePct(
  teamId: string,
  playerId: string,
  maxSessions = 8
): Promise<number | null> {
  if (!teamId.trim() || !playerId.trim()) return null;

  try {
    const sessions = await readAcademySessionsForTeam(teamId);
    const eligible = sessions
      .filter((s) => s.status !== "cancelled")
      .sort((a, b) => sessionStartsAtMs(b.startsAt) - sessionStartsAtMs(a.startsAt))
      .slice(0, maxSessions);

    if (eligible.length === 0) return null;

    const rowsBySession = await Promise.all(
      eligible.map((s) => readAttendanceForSession(teamId, s.sessionId).catch(() => []))
    );

    let recorded = 0;
    let attended = 0;

    for (const rows of rowsBySession) {
      const row = rows.find((r) => r.targetUid === playerId);
      if (!row) continue;
      recorded++;
      if (ATTENDED.has(row.status)) attended++;
    }

    if (recorded === 0) return null;
    return Math.round((attended / recorded) * 100);
  } catch (error) {
    console.warn("[loadPlayerAttendanceRatePct]", error);
    return null;
  }
}
