import { CalendarPlus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamMatchHistory } from "@/types/teamSummary";

export type TeamHubRecentMatchesPreviewProps = {
  teamName: string;
  matches: TeamMatchHistory[];
  dark?: boolean;
  canManage: boolean;
  formatDate: (timestamp: unknown) => string;
  onViewAll: () => void;
  onJoin: () => void;
  onCreateSchedule: () => void;
  safeOpponentName: (match: TeamMatchHistory) => string;
};

export function TeamHubRecentMatchesPreview({
  teamName,
  matches,
  dark = false,
  canManage,
  formatDate,
  onViewAll,
  onJoin,
  onCreateSchedule,
  safeOpponentName,
}: TeamHubRecentMatchesPreviewProps) {
  const sectionClass = cn(
    "rounded-xl border p-4 shadow-sm sm:p-5",
    dark ? "border-slate-600/80 bg-slate-800/30 text-slate-100" : "border-gray-200 bg-white/95 text-gray-900"
  );

  return (
    <section className={sectionClass} aria-label="최근 경기">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={cn("text-sm font-semibold tracking-tight", dark ? "text-slate-100" : "text-gray-900")}>
          최근 경기
        </h2>
        {matches.length > 0 ? (
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
            전체 보기
          </Button>
        ) : null}
      </div>

      {matches.length === 0 ? (
        <RecentMatchesEmpty
          dark={dark}
          canManage={canManage}
          onJoin={onJoin}
          onCreateSchedule={onCreateSchedule}
        />
      ) : (
        <ul className="mt-3 space-y-2">
          {matches.slice(0, 3).map((match) => (
            <li
              key={match.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm",
                dark ? "border-slate-600/70 bg-slate-900/40" : "border-gray-100 bg-gray-50/90"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-snug">
                  {match.isHome ? teamName : safeOpponentName(match)}{" "}
                  <span className={dark ? "text-slate-500" : "text-gray-400"}>vs</span>{" "}
                  {match.isHome ? safeOpponentName(match) : teamName}
                </div>
                <div className={cn("mt-0.5 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
                  {formatDate(match.matchDate)}
                  {match.stageLabel ? ` · ${match.stageLabel}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold tabular-nums">
                  {match.isHome
                    ? `${match.scored} - ${match.conceded}`
                    : `${match.conceded} - ${match.scored}`}
                </div>
                <div
                  className={cn(
                    "text-[11px] font-semibold",
                    match.result === "win"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : match.result === "loss"
                        ? "text-red-600 dark:text-red-400"
                        : dark
                          ? "text-slate-400"
                          : "text-gray-500"
                  )}
                >
                  {match.result === "win" ? "승" : match.result === "loss" ? "패" : "무"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentMatchesEmpty({
  dark,
  canManage,
  onJoin,
  onCreateSchedule,
}: {
  dark: boolean;
  canManage: boolean;
  onJoin: () => void;
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
          일정을 등록하면 팀원·방문자가 경기를 확인할 수 있어요.
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
        아직 공개된 경기 일정이 없습니다
      </p>
      <p className={cn("mt-1 text-xs", dark ? "text-slate-400" : "text-gray-500")}>
        팀에 참여해 일정과 경기 기록을 함께 확인해 보세요.
      </p>
      <Button type="button" size="sm" variant="outline" className={cn("mt-3 gap-1.5", dark ? "border-slate-500" : "")} onClick={onJoin}>
        <UserPlus className="h-3.5 w-3.5" />
        팀 참여하기
      </Button>
    </div>
  );
}
