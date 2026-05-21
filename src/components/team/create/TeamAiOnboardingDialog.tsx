import { useState } from "react";
import {
  TEAM_ONBOARD_MAIN_ACTIVITY,
  TEAM_ONBOARD_RECRUIT,
  TEAM_ONBOARD_VIBE,
  DEFAULT_TEAM_ONBOARDING,
  type TeamOnboardMainActivityId,
  type TeamOnboardRecruitId,
  type TeamOnboardVibeId,
} from "@/lib/team/teamBrandingConstants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TeamAiOnboardingAnswers = {
  mainActivity: TeamOnboardMainActivityId;
  vibe: TeamOnboardVibeId;
  recruitStyle: TeamOnboardRecruitId;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: (answers: TeamAiOnboardingAnswers) => void | Promise<void>;
  onSkip: () => void | Promise<void>;
};

export function TeamAiOnboardingDialog({ open, onOpenChange, loading, onConfirm, onSkip }: Props) {
  const [mainActivity, setMainActivity] = useState<TeamOnboardMainActivityId>(
    DEFAULT_TEAM_ONBOARDING.mainActivity
  );
  const [vibe, setVibe] = useState<TeamOnboardVibeId>(DEFAULT_TEAM_ONBOARDING.vibe);
  const [recruitStyle, setRecruitStyle] = useState<TeamOnboardRecruitId>(
    DEFAULT_TEAM_ONBOARDING.recruitStyle
  );

  const chipClass = (active: boolean) =>
    cn(
      "rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition",
      active
        ? "border-indigo-500 bg-indigo-50 text-indigo-950 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-50"
        : "border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">팀을 더 멋지게 만들어볼까요? ✨</DialogTitle>
          <DialogDescription className="text-base text-gray-600 dark:text-gray-400">
            선택만 하면 소개·슬로건이 자동으로 만들어져요. (약 30초)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section>
            <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Q1. 주 활동은?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TEAM_ONBOARD_MAIN_ACTIVITY.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={chipClass(mainActivity === o.id)}
                  onClick={() => setMainActivity(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Q2. 분위기?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TEAM_ONBOARD_VIBE.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={chipClass(vibe === o.id)}
                  onClick={() => setVibe(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Q3. 모집 스타일?
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TEAM_ONBOARD_RECRUIT.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={chipClass(recruitStyle === o.id)}
                  onClick={() => setRecruitStyle(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            disabled={loading}
            onClick={() => void onSkip()}
          >
            건너뛰기
          </Button>
          <Button
            type="button"
            className="w-full bg-indigo-600 font-semibold hover:bg-indigo-700 sm:w-auto"
            disabled={loading}
            onClick={() =>
              void onConfirm({
                mainActivity,
                vibe,
                recruitStyle,
              })
            }
          >
            {loading ? "처리 중…" : "팀 만들기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
