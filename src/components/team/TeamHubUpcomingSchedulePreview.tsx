import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarPlus, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUpcomingScheduledMatches } from "@/services/scheduledMatchService";
import type { ScheduledMatch } from "@/types/scheduledMatch";

export type TeamHubUpcomingSchedulePreviewProps = {
  teamId: string;
  isActiveMember: boolean;
  canManage: boolean;
  dark?: boolean;
  onViewAll: () => void;
  onCreateSchedule: () => void;
};

function formatStart(m: ScheduledMatch): string {
  try {
    return format(m.startAt.toDate(), "M월 d일 (EEE) HH:mm", { locale: ko });
  } catch {
    return "";
  }
}

export function TeamHubUpcomingSchedulePreview({
  teamId,
  isActiveMember,
  canManage,
  dark = false,
  onViewAll,
  onCreateSchedule,
}: TeamHubUpcomingSchedulePreviewProps) {
  const [rows, setRows] = useState<ScheduledMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tid = teamId.trim();
    if (!tid) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getUpcomingScheduledMatches(tid, { forActiveMember: isActiveMember, limit: 5 })
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, isActiveMember]);

  const sectionClass = cn(
    "rounded-xl border p-4 shadow-sm",
    dark ? "border-slate-600/80 bg-slate-800/30 text-slate-100" : "border-gray-200 bg-white/95 text-gray-900"
  );

  return (
    <section className={sectionClass} aria-label="다가오는 경기 미리보기">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={cn("text-sm font-semibold tracking-tight", dark ? "text-slate-100" : "text-gray-900")}>
          다가오는 경기 미리보기
        </h2>
        {!loading && rows.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 text-xs font-medium",
              dark ? "text-slate-300 hover:bg-white/10" : "text-indigo-700 hover:bg-indigo-50"
            )}
            onClick={onViewAll}
          >
            일정·기록 전체
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className={cn("mt-4 flex items-center gap-2 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          일정 불러오는 중…
        </div>
      ) : rows.length === 0 ? (
        <UpcomingEmpty dark={dark} canManage={canManage} onViewAll={onViewAll} onCreateSchedule={onCreateSchedule} />
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 3).map((m) => (
            <li
              key={m.id}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm",
                dark ? "border-slate-600/70 bg-slate-900/40" : "border-gray-100 bg-gray-50/90"
              )}
            >
              <div className="font-medium leading-snug">{m.title}</div>
              <div className={cn("mt-0.5 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
                {formatStart(m)}
              </div>
              {m.location ? (
                <div
                  className={cn("mt-1 flex items-center gap-1 text-xs", dark ? "text-slate-400" : "text-gray-500")}
                >
                  <MapPin className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  <span className="truncate">{m.location}</span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UpcomingEmpty({
  dark,
  canManage,
  onViewAll,
  onCreateSchedule,
}: {
  dark: boolean;
  canManage: boolean;
  onViewAll: () => void;
  onCreateSchedule: () => void;
}) {
  if (canManage) {
    return (
      <div
        className={cn(
          "mt-4 rounded-lg border border-dashed px-4 py-5 text-center",
          dark ? "border-slate-600 bg-slate-900/30" : "border-gray-200 bg-gray-50/80"
        )}
      >
        <p className={cn("text-sm font-medium", dark ? "text-slate-200" : "text-gray-800")}>
          이번 주 경기 일정을 만들어 보세요
        </p>
        <p className={cn("mt-1 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
          등록한 일정은 방문자에게도 보이고, RSVP는 경기 탭에서 관리할 수 있어요.
        </p>
        <Button type="button" size="sm" className="mt-3 gap-1.5" onClick={onCreateSchedule}>
          <CalendarPlus className="h-3.5 w-3.5" />
          경기 일정 만들기
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-4 rounded-lg border border-dashed px-4 py-5 text-center",
        dark ? "border-slate-600 bg-slate-900/30" : "border-gray-200 bg-gray-50/80"
      )}
    >
      <p className={cn("text-sm font-medium", dark ? "text-slate-200" : "text-gray-800")}>
        다가오는 경기를 준비 중입니다.
      </p>
      <p className={cn("mt-1 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
        일정이 등록되면 여기에 미리보기가 표시돼요.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("mt-3 gap-1.5", dark ? "border-slate-500" : "")}
        onClick={onViewAll}
      >
        경기 탭 보기
      </Button>
    </div>
  );
}
