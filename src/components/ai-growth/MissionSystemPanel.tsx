/**
 * J3-1 — Parent Home Mission System (read-only)
 */
import { CheckCircle2, Circle, Target } from "lucide-react";
import { buildMissionSystemView } from "@/lib/ai-growth/missionSystemView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";
import { cn } from "@/lib/utils";

type Props = {
  avatar: PlayerGrowthAvatarDoc;
  todaySessions: PlayerGrowthSessionDoc[];
  className?: string;
};

export function MissionSystemPanel({ avatar, todaySessions, className }: Props) {
  const view = buildMissionSystemView({ avatar, todaySessions });

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/50 px-3 py-3",
        className
      )}
      data-testid="j3-mission-system-panel"
      aria-label="오늘의 미션"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-teal-950">
        <Target className="h-4 w-4 text-teal-600" aria-hidden />
        오늘의 미션
      </h3>

      <div
        className="mt-3 rounded-lg border border-teal-100 bg-white/90 px-3 py-2.5"
        data-testid="j3-mission-current"
      >
        <p className="text-[10px] font-semibold text-teal-700">현재 미션</p>
        <p className="mt-1 flex items-center gap-2 text-sm font-bold text-teal-950">
          {view.todayMission.completed ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
          ) : (
            <Circle className="h-4 w-4 text-teal-500" aria-hidden />
          )}
          {view.todayMission.label}
        </p>
        <p className="mt-0.5 text-lg font-black tabular-nums text-teal-950">
          {view.todayMission.current} / {view.todayMission.target}
        </p>
      </div>

      <div className="mt-3" data-testid="j3-mission-progress">
        <p className="text-xs font-bold tabular-nums text-teal-900">
          {view.todayMission.current} / {view.todayMission.target}
          <span className="ml-2 text-teal-700">{view.progress}%</span>
        </p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-teal-100">
          <div
            className="h-full rounded-full bg-teal-600 transition-all"
            style={{ width: `${view.progress}%` }}
            role="progressbar"
            aria-valuenow={view.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <div className="mt-3" data-testid="j3-mission-reward">
        <p className="text-[10px] font-semibold text-teal-700">예상 보상</p>
        <p className="mt-0.5 text-sm font-bold text-teal-950">{view.reward}</p>
      </div>

      {view.nextMission ? (
        <div
          className="mt-3 rounded-lg border border-cyan-100 bg-white/80 px-3 py-2"
          data-testid="j3-mission-next"
        >
          <p className="text-[10px] font-semibold text-cyan-800">다음 미션</p>
          <p className="mt-1 text-sm font-bold text-cyan-950">{view.nextMission.label}</p>
          <p className="mt-0.5 text-xs tabular-nums text-cyan-800">
            {view.nextMission.current} / {view.nextMission.target}
            <span className="ml-1 text-cyan-700">· {view.nextMission.reward}</span>
          </p>
        </div>
      ) : null}

      <ul className="mt-3 space-y-1" data-testid="j3-mission-system-list">
        {view.missions.map((mission) => (
          <li
            key={mission.id}
            className="flex items-center justify-between gap-2 text-xs text-teal-900"
            data-testid={`j3-mission-system-item-${mission.id}`}
          >
            <span className="flex items-center gap-1.5">
              {mission.completed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="h-3.5 w-3.5 text-teal-400" aria-hidden />
              )}
              {mission.label}
            </span>
            <span className="tabular-nums font-semibold">
              {mission.current}/{mission.target}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
