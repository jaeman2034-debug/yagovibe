/**
 * 🔥 참가 신청 기간 안내 배너
 * 
 * 커서 지시문 1️⃣, 2️⃣ 기반:
 * - 신청 기간 상태에 따라 다른 메시지 표시
 * - 버튼 상태 제어
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import { checkRegistrationPeriod, type RegistrationPeriodStatus } from "@/lib/tournament/registrationPeriod";

interface RegistrationPeriodBannerProps {
  tournament: Tournament;
  className?: string;
}

const STATUS_CONFIG: Record<RegistrationPeriodStatus, {
  icon: React.ReactNode;
  variant: "default" | "destructive" | "secondary";
  title: string;
  color: string;
}> = {
  not_started: {
    icon: <Clock className="h-4 w-4" />,
    variant: "secondary",
    title: "신청 기간 전",
    color: "bg-gray-50 border-gray-200",
  },
  open: {
    icon: <CheckCircle className="h-4 w-4" />,
    variant: "default",
    title: "신청 기간 중",
    color: "bg-green-50 border-green-200",
  },
  roster_edit_only: {
    icon: <AlertTriangle className="h-4 w-4" />,
    variant: "secondary",
    title: "명단 수정만 가능",
    color: "bg-yellow-50 border-yellow-200",
  },
  closed: {
    icon: <XCircle className="h-4 w-4" />,
    variant: "destructive",
    title: "신청 마감",
    color: "bg-red-50 border-red-200",
  },
};

export function RegistrationPeriodBanner({ tournament, className }: RegistrationPeriodBannerProps) {
  const periodCheck = useMemo(() => checkRegistrationPeriod(tournament), [tournament]);
  const config = STATUS_CONFIG[periodCheck.status];

  return (
    <Alert className={`${config.color} ${className || ""}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            {config.title}
            <Badge variant={config.variant} className="text-xs">
              {periodCheck.canApply ? "신청 가능" : "신청 불가"}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            {periodCheck.message}
          </AlertDescription>
          
          {/* 기간 상세 정보 */}
          {tournament.registrationPeriod && (
            <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                신청 기간: {tournament.registrationPeriod.startDate} ~ {tournament.registrationPeriod.endDate}
              </span>
              {tournament.registrationPeriod.rosterEditDeadline && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  명단 수정 마감: {tournament.registrationPeriod.rosterEditDeadline}
                </span>
              )}
            </div>
          )}
          
          {/* 남은 일수 표시 */}
          {(periodCheck.daysUntilStart !== undefined || periodCheck.daysUntilEnd !== undefined) && (
            <div className="mt-2 text-xs font-medium">
              {periodCheck.daysUntilStart !== undefined && periodCheck.daysUntilStart > 0 && (
                <span className="text-gray-600">시작까지 {periodCheck.daysUntilStart}일</span>
              )}
              {periodCheck.daysUntilEnd !== undefined && periodCheck.daysUntilEnd > 0 && periodCheck.status === "open" && (
                <span className="text-green-600">마감까지 {periodCheck.daysUntilEnd}일</span>
              )}
              {periodCheck.daysUntilRosterDeadline !== undefined && periodCheck.daysUntilRosterDeadline > 0 && periodCheck.status === "roster_edit_only" && (
                <span className="text-yellow-600">명단 수정 마감까지 {periodCheck.daysUntilRosterDeadline}일</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}

/**
 * 간단한 인라인 배지 버전
 */
export function RegistrationPeriodBadge({ tournament }: { tournament: Tournament }) {
  const periodCheck = useMemo(() => checkRegistrationPeriod(tournament), [tournament]);
  const config = STATUS_CONFIG[periodCheck.status];

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      {config.title}
    </Badge>
  );
}

