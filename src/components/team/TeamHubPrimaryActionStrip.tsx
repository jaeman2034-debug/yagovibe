import { useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardCheck, Compass, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playgroundPath, teamPlayLobbyPath } from "@/lib/play/playEcosystemRoutes";
import { markTeamPlayEntryFromAppNav } from "@/lib/team/teamPlayRoutes";

export type TeamHubPrimaryActionStripProps = {
  teamId: string;
  dark?: boolean;
  user: { uid: string } | null;
  hubCtaReady: boolean;
  isActiveMember: boolean;
  browseTeamsPath?: string;
  onViewMatchesSchedule: () => void;
  hubShareBusy: boolean;
  onKakaoInquiry: () => void | Promise<void>;
};

const primaryClass =
  "gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-bold text-white shadow-md hover:from-violet-700 hover:to-indigo-700 sm:text-sm";

/**
 * 공개 팀 허브 CTA — 역할별 우선순위.
 * 방문자·비팀원: 운동장 → 팀 참여 → 다른 팀 (플랫폼 우선)
 * 팀원·운영진: 플레이 라운지 → 경기 일정 → 참석 응답
 */
export function TeamHubPrimaryActionStrip({
  teamId,
  dark = false,
  user,
  hubCtaReady,
  isActiveMember,
  browseTeamsPath,
  onViewMatchesSchedule,
}: TeamHubPrimaryActionStripProps) {
  const navigate = useNavigate();
  const tid = teamId.trim();
  if (!tid) return null;

  const btnOutline = cn(
    "gap-1.5 text-xs font-semibold sm:text-sm",
    dark ? "border-slate-500 bg-slate-900/40 text-slate-100 hover:bg-slate-800" : ""
  );
  const btnSecondary = cn(
    "gap-1.5 text-xs font-semibold sm:text-sm",
    dark ? "border-slate-500 text-slate-100 hover:bg-white/10" : "border-gray-300"
  );

  const goTeamPlayLobby = () => {
    markTeamPlayEntryFromAppNav();
    navigate(teamPlayLobbyPath(tid));
  };

  const goPlayground = () => {
    navigate(playgroundPath());
  };

  const goJoin = () => navigate(`/join?teamId=${encodeURIComponent(tid)}${user ? "&ref=apply" : ""}`);

  const browseHref = browseTeamsPath?.trim() || "/sports/soccer?tab=team";

  if (user && !hubCtaReady) {
    return (
      <div
        className={cn("flex h-9 items-center gap-2 text-xs", dark ? "text-slate-400" : "text-gray-500")}
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        참여 가능 여부 확인 중…
      </div>
    );
  }

  if (isActiveMember) {
    return (
      <div className="flex flex-wrap gap-2" role="group" aria-label="팀 활동">
        <Button type="button" size="sm" className={primaryClass} onClick={goTeamPlayLobby}>
          플레이 라운지 입장
        </Button>
        <Button type="button" size="sm" variant="outline" className={btnOutline} onClick={onViewMatchesSchedule}>
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
          경기 일정
        </Button>
        <Button type="button" size="sm" variant="ghost" className={btnOutline} onClick={onViewMatchesSchedule}>
          <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden />
          참석 응답
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="팀 탐색">
      <Button type="button" size="sm" className={primaryClass} onClick={goPlayground}>
        운동장 입장
      </Button>
      <Button type="button" size="sm" variant="outline" className={btnSecondary} onClick={goJoin}>
        <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
        팀 참여하기
      </Button>
      <Button type="button" size="sm" variant="ghost" className={btnOutline} onClick={() => navigate(browseHref)}>
        <Compass className="h-4 w-4 shrink-0" aria-hidden />
        다른 팀 보기
      </Button>
    </div>
  );
}
