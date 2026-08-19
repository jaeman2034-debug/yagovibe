import type { AcademySessionRow } from "@/lib/academy/academySessionRead";
import { formatSessionWhen, sessionStatusLabel } from "@/features/academy/attendance/academySessionFormat";
import { cn } from "@/lib/utils";

type Props = {
  session: AcademySessionRow;
  selected?: boolean;
  onSelect: () => void;
  showManageActions?: boolean;
  canEdit?: boolean;
  canCancel?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
};

export function AcademySessionCard({
  session,
  selected,
  onSelect,
  showManageActions,
  canEdit,
  canCancel,
  onEdit,
  onCancel,
}: Props) {
  const cancelled = session.status === "cancelled";

  return (
    <div
      className={cn(
        "w-full rounded-lg border px-3 py-3 text-left transition-colors",
        selected
          ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
        cancelled && "opacity-75"
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">{session.title || "세션"}</p>
          <span
            className={cn(
              "shrink-0 select-none rounded-full px-2 py-0.5 text-[10px] font-medium",
              session.status === "open"
                ? "bg-emerald-100 text-emerald-800"
                : session.status === "cancelled"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-700"
            )}
            aria-label={`세션 상태: ${sessionStatusLabel(session.status)}`}
          >
            {sessionStatusLabel(session.status)}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{formatSessionWhen(session.startsAt)}</p>
        {session.notes ? (
          <p className="mt-2 line-clamp-2 text-xs text-gray-600">{session.notes}</p>
        ) : null}
      </button>

      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-gray-100 pt-2">
        {cancelled ? (
          <p className="text-[10px] text-red-700">
            취소된 세션입니다. 출석 기록은 불가합니다. 새 훈련을 만들어 주세요.
          </p>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="rounded-md bg-violet-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-violet-700"
          >
            출석 진행
          </button>
        )}
        {showManageActions && canEdit && !cancelled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-50"
          >
            수정
          </button>
        ) : null}
        {showManageActions && canCancel && !cancelled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel?.();
            }}
            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100"
          >
            취소
          </button>
        ) : null}
      </div>
    </div>
  );
}
