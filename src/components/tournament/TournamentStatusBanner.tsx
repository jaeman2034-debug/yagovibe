/**
 * 🔥 대회 상태 배너 (팀 총무 기준 UX)
 * 
 * 날짜 기준 자동 전환:
 * - 🟢 참가 신청 가능
 * - 🟡 선수 명단 수정 기간
 * - 🔴 신청 마감
 */

import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import { checkRegistrationPeriod, type RegistrationPeriodStatus } from "@/lib/tournament/registrationPeriod";
import { canEditRoster } from "@/lib/tournament/registrationPeriod";

export type TournamentStatusType = 
  | "registration_open" // 🟢 참가 신청 가능
  | "roster_edit_only" // 🟡 선수 명단 수정 기간
  | "registration_closed" // 🔴 신청 마감
  | "review_in_progress" // 🟡 검수 중
  | "review_completed" // ✅ 검수 완료
  | "draw_done" // 🎲 조 추첨 완료 (STEP 4)
  | "checkin_open" // 🔥 STEP 6: 체크인 가능
  | "matches_running"; // 🔥 STEP 6: 경기 진행 중

interface TournamentStatusBannerProps {
  tournament: Tournament;
  className?: string;
}

export function TournamentStatusBanner({ tournament, className }: TournamentStatusBannerProps) {
  const periodCheck = useMemo(() => checkRegistrationPeriod(tournament), [tournament]);
  
  // 🔥 상태 계산
  const status = useMemo((): TournamentStatusType => {
    // 🔥 STEP 4: 조 추첨 완료 상태 최우선 체크
    if (tournament.tournamentPhase === "DRAW_DONE") {
      return "draw_done";
    }
    
    // 검수 기간 중
    if (tournament.reviewPeriod?.startDate && tournament.reviewPeriod?.endDate) {
      const now = new Date();
      const reviewStart = new Date(tournament.reviewPeriod.startDate);
      const reviewEnd = new Date(tournament.reviewPeriod.endDate);
      reviewEnd.setHours(23, 59, 59, 999);
      
      if (now >= reviewStart && now <= reviewEnd) {
        return "review_in_progress";
      }
      
      if (now > reviewEnd) {
        return "review_completed";
      }
    }
    
    // 신청 기간 체크
    if (periodCheck.canApply) {
      return "registration_open";
    }
    
    // 선수 수정 기간 체크
    if (canEditRoster(tournament)) {
      return "roster_edit_only";
    }
    
    return "registration_closed";
  }, [tournament, periodCheck]);

  const statusConfig: Record<TournamentStatusType, {
    icon: React.ReactNode;
    variant: "default" | "destructive" | "secondary";
    title: string;
    description: string;
    color: string;
  }> = {
    registration_open: {
      icon: <CheckCircle className="h-5 w-5" />,
      variant: "default",
      title: "🟢 참가 신청 가능",
      description: "팀 단위로 참가 신청이 가능합니다.",
      color: "bg-green-50 border-green-200",
    },
    roster_edit_only: {
      icon: <Clock className="h-5 w-5" />,
      variant: "secondary",
      title: "🟡 선수 명단 수정 기간",
      description: "신청 마감. 선수 명단만 수정 가능합니다.",
      color: "bg-yellow-50 border-yellow-200",
    },
    registration_closed: {
      icon: <XCircle className="h-5 w-5" />,
      variant: "destructive",
      title: "🔴 신청 마감",
      description: "참가 신청 및 선수 명단 수정이 마감되었습니다.",
      color: "bg-red-50 border-red-200",
    },
    review_in_progress: {
      icon: <AlertCircle className="h-5 w-5" />,
      variant: "secondary",
      title: "🟡 사무국 검수 중",
      description: "현재 사무국에서 선수 자격을 검수 중입니다. 확인만 가능합니다.",
      color: "bg-yellow-50 border-yellow-200",
    },
    review_completed: {
      icon: <CheckCircle className="h-5 w-5" />,
      variant: "default",
      title: "✅ 검수 완료",
      description: "사무국 검수가 완료되었습니다. 조 추첨을 기다려주세요.",
      color: "bg-green-50 border-green-200",
    },
    draw_done: {
      icon: <CheckCircle className="h-5 w-5" />,
      variant: "default",
      title: "🎲 조 추첨 완료",
      description: "조 추첨이 완료되었습니다. 아래에서 조 편성을 확인하세요.",
      color: "bg-purple-50 border-purple-200",
    },
    checkin_open: {
      icon: <CheckCircle className="h-5 w-5" />,
      variant: "default",
      title: "📋 체크인 기간",
      description: "대회 당일 체크인을 완료해주세요. 체크인 장소에서 확인하세요.",
      color: "bg-blue-50 border-blue-200",
    },
    matches_running: {
      icon: <CheckCircle className="h-5 w-5" />,
      variant: "default",
      title: "⚽ 경기 진행 중",
      description: "대회가 진행 중입니다. 경기 일정을 확인하세요.",
      color: "bg-orange-50 border-orange-200",
    },
  };

  const config = statusConfig[status];

  return (
    <Alert className={`${config.color} ${className || ""} sticky top-0 z-10`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2 mb-1">
            {config.title}
            <Badge variant={config.variant} className="text-xs">
              {status === "registration_open" && "신청 가능"}
              {status === "roster_edit_only" && "수정 가능"}
              {status === "registration_closed" && "마감"}
              {status === "review_in_progress" && "검수 중"}
              {status === "review_completed" && "완료"}
              {status === "draw_done" && "추첨 완료"}
              {status === "checkin_open" && "체크인"}
              {status === "matches_running" && "경기 중"}
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-sm">
            {config.description}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

