import { useCallback, useEffect, useState } from "react";
import { readAcademySessionsForTeam, type AcademySessionRow } from "@/lib/academy/academySessionRead";
import { readAttendanceForSession, type AcademyAttendanceRow } from "@/lib/academy/academyAttendanceRead";
import { readParentLinksForTeam, type ParentLinkRow } from "@/lib/team/parentLinksRead";

export function useAcademyAttendanceData(teamId: string | undefined) {
  const [sessions, setSessions] = useState<AcademySessionRow[]>([]);
  const [links, setLinks] = useState<ParentLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!teamId) {
      setSessions([]);
      setLinks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let sessionRows: Awaited<ReturnType<typeof readAcademySessionsForTeam>> = [];
      let linkRows: ParentLinkRow[] = [];
      try {
        sessionRows = await readAcademySessionsForTeam(teamId);
      } catch (sessionErr) {
        console.error("[useAcademyAttendanceData] sessions", sessionErr);
        throw sessionErr;
      }
      try {
        linkRows = await readParentLinksForTeam(teamId);
      } catch (linkErr) {
        console.warn("[useAcademyAttendanceData] parentLinks (non-fatal)", linkErr);
        linkRows = [];
      }
      setSessions(sessionRows);
      setLinks(linkRows);
    } catch (e) {
      const code =
        e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
      console.error("[useAcademyAttendanceData]", e);
      setError(
        code.includes("permission")
          ? "출석 세션 목록 권한이 없습니다. 팀 멤버십을 확인해 주세요."
          : "출석 세션 목록을 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, links, loading, error, refresh };
}

export function useAcademySessionAttendance(
  teamId: string | undefined,
  sessionId: string | undefined
) {
  const [rows, setRows] = useState<AcademyAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!teamId || !sessionId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await readAttendanceForSession(teamId, sessionId);
      setRows(data);
    } catch (e) {
      console.error("[useAcademySessionAttendance]", e);
      setError("출석 기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [teamId, sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}
