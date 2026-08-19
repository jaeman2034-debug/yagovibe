import { Loader2 } from "lucide-react";
import type { AcademySessionRow } from "@/lib/academy/academySessionRead";
import type { AcademyAttendanceRow } from "@/lib/academy/academyAttendanceRead";
import type { AcademyAttendanceStatus } from "@/lib/academy/academyAttendanceReadTypes";
import type { AcademyMemberRole } from "@/lib/team/academyMemberRole";
import {
  canMarkAcademyAttendance,
  filterAttendanceForViewer,
} from "@/lib/academy/academyReadSelectors";
import type { ParentLinkRow } from "@/lib/team/parentLinksRead";
import type { TeamMemberRow } from "@/lib/team/teamMemberReadTypes";
import { formatSessionWhen, sessionStatusLabel } from "@/features/academy/attendance/academySessionFormat";

const ATTENDANCE_LABEL: Record<string, string> = {
  present: "출석",
  absent: "결석",
  late: "지각",
  excused: "사유",
};

const STATUS_OPTIONS: AcademyAttendanceStatus[] = ["present", "absent", "late", "excused"];

type Props = {
  session: AcademySessionRow | null;
  attendance: AcademyAttendanceRow[];
  markTargets: TeamMemberRow[];
  loading: boolean;
  error: string | null;
  viewerUid?: string;
  viewerRole: AcademyMemberRole;
  parentLinks: ParentLinkRow[];
  targetDisplayNames?: Map<string, string>;
  canMutate: boolean;
  mutationPendingKey: string | null;
  onMarkAttendance: (args: {
    targetUid: string;
    status: AcademyAttendanceStatus;
  }) => Promise<void>;
  onBulkMarkAllPresent: () => Promise<void>;
};

function attendanceByUid(rows: AcademyAttendanceRow[]): Map<string, AcademyAttendanceRow> {
  const map = new Map<string, AcademyAttendanceRow>();
  for (const r of rows) map.set(r.targetUid, r);
  return map;
}

export function AcademySessionDetailShell({
  session,
  attendance,
  markTargets,
  loading,
  error,
  viewerUid,
  viewerRole,
  parentLinks,
  targetDisplayNames,
  canMutate,
  mutationPendingKey,
  onMarkAttendance,
  onBulkMarkAllPresent,
}: Props) {
  if (!session) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-8 text-center text-xs text-gray-600">
        세션을 선택하면 출석 요약을 볼 수 있습니다.
      </p>
    );
  }

  const mayMark = canMutate && canMarkAcademyAttendance(viewerRole);
  const sessionOpen = session.status === "open";
  const attMap = attendanceByUid(attendance);

  const readRows =
    viewerUid != null
      ? filterAttendanceForViewer(attendance, viewerUid, viewerRole, parentLinks)
      : [];

  const coachRows =
    mayMark && sessionOpen
      ? markTargets.map((m) => ({
          targetUid: m.memberDocumentId,
          displayName: m.displayName,
          status: attMap.get(m.memberDocumentId)?.status,
        }))
      : [];

  const bulkDisabled =
    !mayMark || !sessionOpen || markTargets.length === 0 || mutationPendingKey != null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
      <h3 className="text-sm font-semibold text-gray-900">{session.title}</h3>
      <p className="mt-0.5 text-xs text-gray-500">{formatSessionWhen(session.startsAt)}</p>
      <p className="mt-1 text-[11px] text-gray-600">
        상태: {sessionStatusLabel(session.status)}
        {mayMark ? (sessionOpen ? " · 출석 기록 가능" : " · open 세션만 기록 가능") : " · 읽기 전용"}
      </p>

      {mayMark && !sessionOpen ? (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          {session.status === "cancelled"
            ? "취소된 세션에는 출석을 기록할 수 없습니다."
            : session.status === "closed"
              ? "마감된 세션은 출석을 읽기 전용으로 볼 수 있습니다."
              : "예정(scheduled) 세션은 open 상태로 전환한 뒤 출석을 기록하세요."}
        </p>
      ) : null}

      {mayMark && sessionOpen ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={bulkDisabled}
            onClick={() => void onBulkMarkAllPresent()}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
          >
            {mutationPendingKey === "bulk-mark" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                일괄 저장 중…
              </span>
            ) : (
              `전원 출석 (${markTargets.length}명)`
            )}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          출석 불러오는 중…
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded bg-red-50 px-2 py-1.5 text-xs text-red-800">{error}</p>
      ) : null}

      {!loading && !error ? (
        <div className="mt-4">
          {mayMark && sessionOpen ? (
            coachRows.length === 0 ? (
              <p className="text-xs text-gray-500">기록할 활성 선수가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {coachRows.map((row) => (
                  <li
                    key={row.targetUid}
                    className="rounded-md border border-gray-100 bg-white px-2 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">{row.displayName}</span>
                      <span className="text-[10px] text-gray-500">
                        {row.status ? ATTENDANCE_LABEL[row.status] ?? row.status : "미기록"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {STATUS_OPTIONS.map((status) => {
                        const key = `mark-${row.targetUid}-${status}`;
                        const active = row.status === status;
                        const pending = mutationPendingKey === key;
                        return (
                          <button
                            key={status}
                            type="button"
                            disabled={mutationPendingKey != null}
                            onClick={() =>
                              void onMarkAttendance({ targetUid: row.targetUid, status })
                            }
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              active
                                ? "bg-gray-900 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            } disabled:opacity-50`}
                          >
                            {pending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              ATTENDANCE_LABEL[status]
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : readRows.length === 0 ? (
            <p className="text-xs text-gray-500">
              {viewerRole === "parent"
                ? "연결된 자녀의 출석 기록이 없습니다."
                : viewerRole === "player"
                  ? "본인 출석 기록이 없습니다."
                  : "출석 기록이 없습니다."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {readRows.map((r) => (
                <li
                  key={r.targetUid}
                  className="flex items-center justify-between rounded-md bg-white px-2 py-1.5 text-xs"
                >
                  <span className="text-gray-900">
                    {targetDisplayNames?.get(r.targetUid) ??
                      `${r.targetUid.slice(0, 8)}…`}
                  </span>
                  <span className="font-medium text-gray-900">
                    {ATTENDANCE_LABEL[r.status] ?? r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!mayMark ? (
            <p className="mt-3 text-[10px] text-gray-400">
              출석 변경은 운영진·코치만 할 수 있습니다.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
