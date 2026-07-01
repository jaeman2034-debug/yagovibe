/**
 * J2-3 — Parent Home Goal System (read-only)
 */
import { Target } from "lucide-react";
import { buildGoalSystemView } from "@/lib/ai-growth/goalSystemView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type Props = {
  avatar: PlayerGrowthAvatarDoc;
  className?: string;
};

export function GoalSystemPanel({ avatar, className }: Props) {
  const view = buildGoalSystemView(avatar);

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/50 px-3 py-3",
        className
      )}
      data-testid="j2-goal-system-panel"
      aria-label="성장 목표"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-violet-950">
        <Target className="h-4 w-4 text-violet-600" aria-hidden />
        Goal System
      </h3>
      {view.primaryFocusLabel ? (
        <p className="mt-1 text-[11px] font-medium text-violet-800">{view.primaryFocusLabel}</p>
      ) : null}

      {view.primaryGoal ? (
        <div className="mt-3 rounded-lg border border-violet-100 bg-white/90 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-violet-700">🎯 현재 목표</p>
          <p
            className="mt-1 text-sm font-bold text-violet-950"
            data-testid="j2-goal-system-primary-goal"
          >
            {view.primaryGoal.label}
            <span className="mt-0.5 block text-lg font-black tabular-nums">
              {view.primaryGoal.current} / {view.primaryGoal.target}
            </span>
          </p>

          <div className="mt-2" data-testid="j2-goal-system-progress">
            <p className="text-xs font-bold tabular-nums text-violet-900">
              {view.primaryGoal.current} / {view.primaryGoal.target}
              <span className="ml-2 text-violet-700">{view.primaryGoal.progress}%</span>
            </p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{ width: `${view.primaryGoal.progress}%` }}
                role="progressbar"
                aria-valuenow={view.primaryGoal.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

          {view.reward ? (
            <div className="mt-3" data-testid="j2-goal-system-reward">
              <p className="text-[10px] font-semibold text-violet-700">예상 보상</p>
              <p className="mt-0.5 text-sm font-bold text-violet-950">{view.reward}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-violet-800">달성 가능한 배지 목표가 없습니다.</p>
      )}

      {view.nextGoal ? (
        <div
          className="mt-3 rounded-lg border border-indigo-100 bg-white/80 px-3 py-2.5"
          data-testid="j2-goal-system-next-goal"
        >
          <p className="text-[10px] font-semibold text-indigo-700">다음 목표</p>
          <p className="mt-1 text-sm font-bold text-indigo-950">
            {view.nextGoal.label}
            <span className="mt-0.5 block tabular-nums">
              {view.nextGoal.current} / {view.nextGoal.target}
            </span>
          </p>
          <p className="mt-1 text-xs text-indigo-800">
            보상 <span className="font-bold text-indigo-950">{view.nextGoal.reward}</span>
          </p>
        </div>
      ) : null}

      <div
        className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5"
        data-testid="j2-goal-system-ovr-goal"
      >
        <p className="text-[10px] font-semibold text-emerald-800">장기 목표</p>
        <p className="mt-1 text-sm font-bold text-emerald-950">
          OVR
          {view.ovrGoal.target != null && view.ovrGoal.current < view.ovrGoal.target ? (
            <span className="mt-0.5 block text-lg font-black tabular-nums">
              {view.ovrGoal.current} / {view.ovrGoal.target}
            </span>
          ) : (
            <span className="mt-0.5 block text-lg font-black tabular-nums">{view.ovrGoal.label}</span>
          )}
        </p>
        {view.ovrGoal.progress != null ? (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${view.ovrGoal.progress}%` }}
              role="progressbar"
              aria-valuenow={view.ovrGoal.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
