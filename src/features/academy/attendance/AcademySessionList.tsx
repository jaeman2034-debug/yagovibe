import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AcademySessionRow } from "@/lib/academy/academySessionRead";
import type { AcademySessionStatus } from "@/lib/academy/academySessionReadTypes";
import {
  canEditAcademySession,
  filterSessionsForViewer,
} from "@/lib/academy/academyReadSelectors";
import type { AcademyMemberRole } from "@/lib/team/academyMemberRole";
import { AcademySessionCard } from "@/features/academy/attendance/AcademySessionCard";
import {
  sortAcademySessions,
  splitActiveAndCancelled,
} from "@/features/academy/attendance/academySessionListSort";

type FilterId = "all" | AcademySessionStatus;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "open", label: "진행" },
  { id: "all", label: "전체" },
  { id: "scheduled", label: "예정" },
  { id: "closed", label: "마감" },
  { id: "cancelled", label: "취소됨" },
];

function coachMayMutateClosed(role: AcademyMemberRole, status: AcademySessionStatus): boolean {
  if (role !== "coach") return true;
  return status !== "closed";
}

type Props = {
  sessions: AcademySessionRow[];
  viewerRole: AcademyMemberRole;
  viewerUid?: string;
  selectedSessionId: string | null;
  showManageActions: boolean;
  onSelectSession: (sessionId: string) => void;
  onEditSession: (session: AcademySessionRow) => void;
  onCancelSession: (session: AcademySessionRow) => void;
};

export function AcademySessionList({
  sessions,
  viewerRole,
  viewerUid,
  selectedSessionId,
  showManageActions,
  onSelectSession,
  onEditSession,
  onCancelSession,
}: Props) {
  /** P1 — 기본 필터: 진행(open) · 취소 세션 기본 숨김 */
  const [filter, setFilter] = useState<FilterId>("open");
  const [cancelledExpanded, setCancelledExpanded] = useState(false);

  const visible = useMemo(
    () => sortAcademySessions(filterSessionsForViewer(sessions, viewerRole)),
    [sessions, viewerRole]
  );

  const { active: activeSessions, cancelled: cancelledSessions } = useMemo(
    () => splitActiveAndCancelled(visible),
    [visible]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return activeSessions;
    return sortAcademySessions(visible.filter((s) => s.status === filter));
  }, [filter, visible, activeSessions]);

  const primaryOpenSession = useMemo(
    () => visible.find((s) => s.status === "open") ?? null,
    [visible]
  );

  const renderSessionCard = (s: AcademySessionRow) => {
    const uid = viewerUid ?? "";
    const baseEdit = uid ? canEditAcademySession(s, viewerRole, uid) : false;
    const baseCancel = baseEdit;
    const mayCoach = coachMayMutateClosed(viewerRole, s.status);
    return (
      <AcademySessionCard
        session={s}
        selected={selectedSessionId === s.sessionId}
        onSelect={() => onSelectSession(s.sessionId)}
        showManageActions={showManageActions}
        canEdit={baseEdit && mayCoach}
        canCancel={baseCancel && mayCoach}
        onEdit={() => onEditSession(s)}
        onCancel={() => onCancelSession(s)}
      />
    );
  };

  const listToShow = useMemo(() => {
    if (filter === "all") return activeSessions;
    if (filter === "cancelled") return cancelledSessions;
    return filtered;
  }, [filter, activeSessions, cancelledSessions, filtered]);

  const emptyMessage =
    filter === "open"
      ? "진행 중인 세션이 없습니다. 「+ 훈련 만들기」로 새 세션을 만드세요."
      : filter === "cancelled"
        ? "취소된 세션이 없습니다."
        : filter === "all"
          ? "표시할 활성 세션이 없습니다."
          : "해당 상태의 세션이 없습니다.";

  if (visible.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-600">
        표시할 훈련 세션이 없습니다.
      </p>
    );
  }

  const showOpenPin =
    (filter === "open" || filter === "all") && primaryOpenSession != null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFilter(f.id);
              if (f.id !== "all") setCancelledExpanded(false);
            }}
            className={
              filter === f.id
                ? "rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-medium text-white"
                : "rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-200"
            }
          >
            {f.label}
            {f.id === "open" && activeSessions.some((s) => s.status === "open")
              ? ` (${activeSessions.filter((s) => s.status === "open").length})`
              : null}
            {f.id === "cancelled" && cancelledSessions.length > 0
              ? ` (${cancelledSessions.length})`
              : null}
          </button>
        ))}
      </div>

      {showOpenPin ? (
        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/90 px-3 py-2.5">
          <p className="text-[11px] font-bold text-emerald-900">🟢 현재 진행 중</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-emerald-950">
            {primaryOpenSession.title || "세션"}
          </p>
          <button
            type="button"
            className="mt-1.5 text-[11px] font-semibold text-emerald-800 underline-offset-2 hover:underline"
            onClick={() => onSelectSession(primaryOpenSession.sessionId)}
          >
            출석 입력 바로가기
          </button>
        </div>
      ) : null}

      {listToShow.length === 0 && !(filter === "all" && cancelledSessions.length > 0) ? (
        <p className="text-xs text-gray-500">{emptyMessage}</p>
      ) : listToShow.length > 0 ? (
        <ul className="space-y-2">
          {listToShow.map((s) => (
            <li key={s.sessionId}>{renderSessionCard(s)}</li>
          ))}
        </ul>
      ) : null}

      {filter === "all" && cancelledSessions.length > 0 ? (
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-100"
            onClick={() => setCancelledExpanded((v) => !v)}
            aria-expanded={cancelledExpanded}
          >
            <span>취소된 세션 {cancelledSessions.length}건</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${cancelledExpanded ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {cancelledExpanded ? (
            <ul className="mt-2 space-y-2">
              {cancelledSessions.map((s) => (
                <li key={s.sessionId}>{renderSessionCard(s)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
