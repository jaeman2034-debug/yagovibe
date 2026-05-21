import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeekScheduleKpis, type WeekScheduleKpis } from "@/services/scheduledMatchService";

export type TeamDashboardStatsProps = {
  teamId: string;
  /** KPI 쿼리 범위 — 활성 팀원이면 비공개 일정 포함 */
  isActiveMember: boolean;
  /** 팀장·운영진 — RSVP 미응답 합계(일정별 건수 합, 멤버 중복 가능) */
  showStaffMetrics: boolean;
  dark?: boolean;
};

function StatTile({
  label,
  value,
  loading,
  dark,
}: {
  label: string;
  value: string | number;
  loading: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3",
        dark ? "border-slate-600/90 bg-slate-900/50 text-slate-100" : "border-gray-200 bg-white/95 text-gray-900 shadow-sm"
      )}
    >
      <div className={cn("text-[11px] font-semibold uppercase tracking-wide", dark ? "text-slate-400" : "text-gray-500")}>
        {label}
      </div>
      <div className="mt-1 flex min-h-[1.75rem] items-center text-xl font-bold tabular-nums sm:text-2xl">
        {loading ? <Loader2 className="h-5 w-5 animate-spin opacity-70" aria-hidden /> : value}
      </div>
    </div>
  );
}

export function TeamDashboardStats({ teamId, isActiveMember, showStaffMetrics, dark }: TeamDashboardStatsProps) {
  const [k, setK] = useState<WeekScheduleKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const tid = teamId.trim();
    if (!tid) {
      setK(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const data = await getWeekScheduleKpis(tid, {
          forActiveMember: isActiveMember,
          includeStaffUnresponded: showStaffMetrics,
        });
        if (!cancelled) setK(data);
      } catch (e) {
        console.error("[TeamDashboardStats]", e);
        if (!cancelled) setK(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, isActiveMember, showStaffMetrics]);

  const unresponded =
    showStaffMetrics && k?.weekUnrespondedSum != null ? k.weekUnrespondedSum : null;

  const fixture = k?.weekFixtureCount ?? 0;
  const going = k?.weekGoingSum ?? 0;
  const staffZero =
    !showStaffMetrics || unresponded === null ? true : Number(unresponded) === 0;
  const allZero =
    !loading && k != null && fixture === 0 && going === 0 && staffZero;

  return (
    <div className="space-y-3" aria-label="이번 주 운영 요약">
      {!allZero ? (
        <div
          className={cn(
            "grid gap-2 sm:gap-3",
            showStaffMetrics ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
          )}
        >
          <StatTile label="이번 주 일정" value={fixture} loading={loading} dark={dark} />
          <StatTile label="참석 예정" value={going} loading={loading} dark={dark} />
          {showStaffMetrics ? (
            <StatTile label="응답 필요" value={unresponded === null ? "—" : unresponded} loading={loading} dark={dark} />
          ) : null}
        </div>
      ) : !loading ? (
        <div
          className={cn(
            "rounded-xl border border-dashed px-4 py-4 text-center text-sm leading-relaxed sm:px-5 sm:py-5 sm:text-base",
            dark
              ? "border-slate-500/80 bg-slate-900/35 text-slate-200"
              : "border-indigo-200/90 bg-indigo-50/60 text-indigo-950"
          )}
          role="status"
        >
          {showStaffMetrics ? (
            <>
              <p className="font-semibold">이번 주 첫 일정을 만들어 보세요</p>
              <p className={cn("mt-1 text-xs sm:text-sm", dark ? "text-slate-400" : "text-indigo-900/80")}>
                일정이 생기면 참석 예정·응답 필요 건수가 한눈에 모여요.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">이번 주 등록된 일정이 없어요</p>
              <p className={cn("mt-1 text-xs sm:text-sm", dark ? "text-slate-400" : "text-indigo-900/80")}>
                팀 일정이 올라오면 참석 예정 숫자도 함께 보여요.
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
