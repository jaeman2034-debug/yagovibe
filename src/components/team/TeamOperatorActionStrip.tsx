import { useNavigate } from "react-router-dom";
import { CalendarPlus, ClipboardCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TeamOperatorActionStripProps = {
  teamId: string;
  show: boolean;
  onScheduleCreate: () => void;
  onScrollToSchedule: () => void;
  dark?: boolean;
};

export function TeamOperatorActionStrip({
  teamId,
  show,
  onScheduleCreate,
  onScrollToSchedule,
  dark,
}: TeamOperatorActionStripProps) {
  const navigate = useNavigate();
  if (!show || !teamId.trim()) return null;

  const tid = teamId.trim();
  const btnOutline = cn(
    "gap-1.5 text-xs font-semibold sm:text-sm",
    dark ? "border-slate-500 bg-slate-900/40 text-slate-100 hover:bg-slate-800" : ""
  );

  return (
    <div className="mb-1 flex flex-wrap gap-2" role="group" aria-label="운영자 빠른 작업">
      <Button type="button" size="sm" className="gap-1.5 text-xs font-semibold sm:text-sm" onClick={onScheduleCreate}>
        <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden />
        일정 만들기
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={btnOutline}
        onClick={() => navigate(`/team/${encodeURIComponent(tid)}/overview`)}
      >
        <Users className="h-4 w-4 shrink-0" aria-hidden />
        멤버 관리
      </Button>
      <Button type="button" size="sm" variant="outline" className={btnOutline} onClick={onScrollToSchedule}>
        <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden />
        참석 체크
      </Button>
    </div>
  );
}
