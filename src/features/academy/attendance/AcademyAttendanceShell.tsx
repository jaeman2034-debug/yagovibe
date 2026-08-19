import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { normalizeMemberRole, type AcademyMemberRole } from "@/lib/team/academyMemberRole";
import {
  canManageAcademySessions,
  canMarkAcademyAttendance,
  canViewAcademyAttendanceSurface,
} from "@/lib/academy/academyReadSelectors";
import type { TeamMemberRow } from "@/lib/team/teamMemberReadTypes";
import {
  loadAcademyAttendanceMarkTargets,
  teamMemberRowsToDisplayNameMap,
} from "@/features/academy/attendance/academyAttendanceMarkTargets";
import type { AcademySessionRow } from "@/lib/academy/academySessionRead";
import { AcademyUnsupportedView } from "@/features/academy/roster/AcademyUnsupportedView";
import { AcademySessionList } from "@/features/academy/attendance/AcademySessionList";
import { AcademySessionDetailShell } from "@/features/academy/attendance/AcademySessionDetailShell";
import {
  AcademySessionFormModal,
  type AcademySessionFormValues,
} from "@/features/academy/attendance/AcademySessionFormModal";
import { AcademySessionCancelDialog } from "@/features/academy/attendance/AcademySessionCancelDialog";
import {
  useAcademyAttendanceData,
  useAcademySessionAttendance,
} from "@/features/academy/attendance/useAcademyAttendanceData";
import { useAcademyAttendanceActions } from "@/features/academy/attendance/mutations/useAcademyAttendanceActions";
import { useAcademySessionActions } from "@/features/academy/attendance/mutations/useAcademySessionActions";
import type { AcademyAttendanceStatus } from "@/lib/academy/academyAttendanceReadTypes";
import { Button } from "@/components/ui/button";

type Props = {
  teamId: string;
  teamName?: string;
  viewerUid?: string;
  viewerRole?: string;
};

export function AcademyAttendanceShell({ teamId, teamName, viewerUid, viewerRole }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = normalizeMemberRole(viewerRole) as AcademyMemberRole;
  const { sessions, links, loading, error, refresh: refreshSessions } = useAcademyAttendanceData(teamId);

  const sessionFromUrl = searchParams.get("session");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionFromUrl);
  const [markTargets, setMarkTargets] = useState<TeamMemberRow[]>([]);
  const [parentTargetNames, setParentTargetNames] = useState<Map<string, string>>(new Map());

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editSession, setEditSession] = useState<AcademySessionRow | null>(null);
  const [cancelSession, setCancelSession] = useState<AcademySessionRow | null>(null);

  const effectiveSessionId = selectedSessionId ?? sessionFromUrl;

  const selectedSession = useMemo(
    () => sessions.find((s) => s.sessionId === effectiveSessionId) ?? null,
    [sessions, effectiveSessionId]
  );

  const {
    rows: attendanceRows,
    loading: attLoading,
    error: attError,
    refresh: refreshAttendance,
  } = useAcademySessionAttendance(teamId, effectiveSessionId);

  const refreshAll = useCallback(async () => {
    await refreshSessions();
    await refreshAttendance();
  }, [refreshSessions, refreshAttendance]);

  const attendanceActions = useAcademyAttendanceActions({ refresh: refreshAll });
  const sessionActions = useAcademySessionActions({ refresh: refreshAll });

  const canMutate = canMarkAcademyAttendance(role);
  const showSessionCrud = canManageAcademySessions(role);

  useEffect(() => {
    if (!teamId || !canMutate) {
      setMarkTargets([]);
      return;
    }
    let cancelled = false;
    void loadAcademyAttendanceMarkTargets(teamId).then((rows) => {
      if (!cancelled) setMarkTargets(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, canMutate]);

  useEffect(() => {
    if (!teamId || role !== "parent") {
      setParentTargetNames(new Map());
      return;
    }
    let cancelled = false;
    void loadAcademyAttendanceMarkTargets(teamId).then((rows) => {
      if (!cancelled) setParentTargetNames(teamMemberRowsToDisplayNameMap(rows));
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, role]);

  const selectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const next = new URLSearchParams(searchParams);
    next.set("tab", "attendance");
    next.set("session", sessionId);
    setSearchParams(next, { replace: true });
  };

  const openCreate = () => {
    setFormMode("create");
    setEditSession(null);
    setFormOpen(true);
  };

  const openEdit = (session: AcademySessionRow) => {
    setFormMode("edit");
    setEditSession(session);
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: AcademySessionFormValues) => {
    if (formMode === "create") {
      await sessionActions.createSession({
        teamId,
        title: values.title,
        startsAt: values.startsAt,
        endsAt: values.endsAt,
        notes: values.notes,
        openImmediately: values.openImmediately,
      });
      setFormOpen(false);
      return;
    }
    if (!editSession) return;
    await sessionActions.updateSession({
      teamId,
      sessionId: editSession.sessionId,
      patch: {
        title: values.title,
        startsAt: values.startsAt,
        ...(values.endsAt !== undefined ? { endsAt: values.endsAt || null } : {}),
        ...(values.notes !== undefined ? { notes: values.notes || null } : {}),
        ...(values.status ? { status: values.status } : {}),
      },
    });
    setFormOpen(false);
    setEditSession(null);
  };

  const handleMark = useCallback(
    async (args: { targetUid: string; status: AcademyAttendanceStatus }) => {
      if (!effectiveSessionId) return;
      await attendanceActions.markAttendance({
        teamId,
        sessionId: effectiveSessionId,
        targetUid: args.targetUid,
        status: args.status,
      });
    },
    [attendanceActions, effectiveSessionId, teamId]
  );

  const handleBulkPresent = useCallback(async () => {
    if (!effectiveSessionId || markTargets.length === 0) return;
    await attendanceActions.bulkMarkAttendance({
      teamId,
      sessionId: effectiveSessionId,
      updates: markTargets.map((m) => ({
        targetUid: m.memberDocumentId,
        status: "present" as const,
      })),
    });
  }, [attendanceActions, effectiveSessionId, markTargets, teamId]);

  const sessionSaving =
    sessionActions.pendingKey === "create-session" ||
    (sessionActions.pendingKey?.startsWith("update-") ?? false);

  const cancelSaving = sessionActions.pendingKey?.startsWith("cancel-") ?? false;

  if (!canViewAcademyAttendanceSurface(role)) {
    return (
      <AcademyUnsupportedView
        title="출석 보기 권한 없음"
        message="이 역할에서는 아카데미 출석 탭을 사용할 수 없습니다."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        출석 세션 불러오는 중…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-200">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">출석 · 훈련 세션</h2>
          <p className="mt-1 text-xs text-gray-500">
            {teamName ? `${teamName} · ` : ""}
            {canMutate
              ? "open 세션에서 출석 기록·일괄 출석이 가능합니다."
              : "출석 요약만 조회할 수 있습니다."}
          </p>
        </div>
        {showSessionCrud ? (
          <Button type="button" size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            훈련 만들기
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AcademySessionList
          sessions={sessions}
          viewerRole={role}
          viewerUid={viewerUid}
          selectedSessionId={effectiveSessionId}
          showManageActions={showSessionCrud}
          onSelectSession={selectSession}
          onEditSession={openEdit}
          onCancelSession={setCancelSession}
        />
        <AcademySessionDetailShell
          session={selectedSession}
          attendance={attendanceRows}
          markTargets={markTargets}
          loading={attLoading}
          error={attError}
          viewerUid={viewerUid}
          viewerRole={role}
          parentLinks={links}
          targetDisplayNames={parentTargetNames}
          canMutate={canMutate}
          mutationPendingKey={attendanceActions.pendingKey}
          onMarkAttendance={handleMark}
          onBulkMarkAllPresent={handleBulkPresent}
        />
      </div>

      <AcademySessionFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditSession(null);
        }}
        mode={formMode}
        session={editSession}
        saving={sessionSaving}
        onSubmit={handleFormSubmit}
      />

      <AcademySessionCancelDialog
        open={Boolean(cancelSession)}
        onOpenChange={(open) => {
          if (!open) setCancelSession(null);
        }}
        sessionTitle={cancelSession?.title}
        saving={cancelSaving}
        onConfirm={async () => {
          if (!cancelSession) return;
          await sessionActions.cancelSession({
            teamId,
            sessionId: cancelSession.sessionId,
          });
          setCancelSession(null);
        }}
      />
    </div>
  );
}
