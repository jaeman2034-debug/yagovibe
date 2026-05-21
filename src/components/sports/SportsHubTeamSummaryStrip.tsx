import { AppCard } from "@/components/ui/AppCard";
import { useSportsHubUser } from "@/context/SportsHubUserContext";
import { Users } from "lucide-react";

/** SETUP / ACTIVE — 대표 팀 한 줄 요약 */
export function SportsHubTeamSummaryStrip() {
  const { userState, primaryTeamName, primaryTeamId } = useSportsHubUser();

  if (!userState.hasTeam || !primaryTeamId) return null;

  const label = primaryTeamName?.trim() || "내 팀";

  return (
    <AppCard className="mb-6 flex items-center gap-3 border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
        <Users className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-xs font-medium text-blue-800 dark:text-blue-200">우리 팀</p>
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
      </div>
    </AppCard>
  );
}
