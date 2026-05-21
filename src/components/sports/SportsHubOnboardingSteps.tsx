import { Check } from "lucide-react";
import { useSportsHubUser } from "@/context/SportsHubUserContext";

/** 팀 → 경기 → 활동(또는 팀원 충원) 진행 표시 */
export function SportsHubOnboardingSteps() {
  const { user, userState } = useSportsHubUser();
  if (!user?.uid) return null;

  const teamDone = userState.hasTeam;
  const matchDone = userState.matchCount > 0;
  const growDone = userState.activityCount > 0 || userState.teamMemberCount >= 5;

  const steps: Array<{ id: string; label: string; done: boolean }> = [
    { id: "team", label: "팀 만들기", done: teamDone },
    { id: "match", label: "경기 등록", done: matchDone },
    { id: "grow", label: "활동·모집", done: growDone },
  ];

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs dark:border-gray-700 dark:bg-gray-900/80"
      aria-label="온보딩 진행 단계"
    >
      <span className="mr-1 font-medium text-gray-500 dark:text-gray-400">진행</span>
      {steps.map((s, i) => (
        <span key={s.id} className="flex items-center gap-1">
          <span
            className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-2 font-semibold ${
              s.done
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {s.done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
          </span>
          <span className={s.done ? "text-gray-700 dark:text-gray-300" : "text-gray-500"}>{s.label}</span>
          {i < steps.length - 1 ? <span className="mx-1 text-gray-300 dark:text-gray-600">·</span> : null}
        </span>
      ))}
    </div>
  );
}
