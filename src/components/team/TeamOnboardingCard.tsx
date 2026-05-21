/**
 * 팀 홈 온보딩 — 멤버·일정·공지 체크리스트 + 진행률
 * 완료는 부모(TeamHome)에서 계산해 전달
 */

import { UserPlus, Calendar, Megaphone, Sparkles, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TeamOnboardingStepState {
  inviteDone: boolean;
  scheduleDone: boolean;
  noticeDone: boolean;
}

interface TeamOnboardingCardProps {
  step: TeamOnboardingStepState;
  onInviteMembers: () => void;
  onCreateSchedule: () => void;
  onWriteNotice: () => void;
  onDismiss: () => void;
}

export function TeamOnboardingCard({
  step,
  onInviteMembers,
  onCreateSchedule,
  onWriteNotice,
  onDismiss,
}: TeamOnboardingCardProps) {
  const { inviteDone, scheduleDone, noticeDone } = step;
  const doneCount = [inviteDone, scheduleDone, noticeDone].filter(Boolean).length;
  const total = 3;

  const items = [
    {
      id: "invite" as const,
      done: inviteDone,
      icon: UserPlus,
      title: "멤버 초대하기",
      subtitle: "멤버 탭에서 초대·역할을 관리하세요",
      onClick: onInviteMembers,
    },
    {
      id: "schedule" as const,
      done: scheduleDone,
      icon: Calendar,
      title: "첫 일정 만들기",
      subtitle: "훈련·경기 일정을 등록해 팀을 움직이게 하세요",
      onClick: onCreateSchedule,
    },
    {
      id: "notice" as const,
      done: noticeDone,
      icon: Megaphone,
      title: "공지 작성하기",
      subtitle: "홈 탭에서 팀원만 보는 안내·공지를 남기세요",
      onClick: onWriteNotice,
    },
  ];

  const nextIndex = items.findIndex((it) => !it.done);
  const highlightIndex = nextIndex === -1 ? -1 : nextIndex;

  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/80 p-4 shadow-sm">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-gray-400 transition hover:bg-white/80 hover:text-gray-700"
        aria-label="온보딩 닫기"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-2 pr-8">
        <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-950">팀을 시작하려면 아래를 완료하세요</p>
          <p className="mt-0.5 text-xs text-emerald-900/80">
            멤버 2명 이상, 일정·공지 중 팀 활동이 생기면 이 안내가 자동으로 사라져요.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
                style={{ width: `${(doneCount / total) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-emerald-900">
              {doneCount}/{total} 완료
            </span>
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((it, index) => {
          const Icon = it.icon;
          const isNext = index === highlightIndex && !it.done;
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={it.onClick}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium shadow-sm transition",
                  it.done
                    ? "border-emerald-200/80 bg-white/70 text-gray-600"
                    : "border-emerald-100 bg-white/90 text-gray-900 hover:border-emerald-200 hover:bg-white",
                  isNext && "ring-2 ring-blue-500/70 ring-offset-1"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    it.done ? "bg-emerald-100 text-emerald-700" : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  {it.done ? (
                    <Check className="h-4 w-4 animate-in fade-in zoom-in-50 duration-200" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block", it.done && "line-through decoration-emerald-600/50")}>
                    {it.title}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-gray-500">{it.subtitle}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 w-full py-2 text-center text-xs font-medium text-emerald-800/70 underline-offset-2 hover:underline"
      >
        나중에 하기
      </button>
    </div>
  );
}
