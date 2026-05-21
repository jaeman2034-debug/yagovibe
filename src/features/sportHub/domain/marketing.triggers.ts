/**
 * 🔥 Marketing Triggers - 트리거 규칙
 * 
 * 대회 임박, 팀 모집, 구장 할인, 장기 미접속
 */

import type { CampaignTrigger } from "./marketing.types";
import type { League } from "./league.types";
import type { Team } from "./team.types";
import type { Ground } from "./booking.types";

/**
 * 대회 임박 트리거 확인
 */
export function checkLeagueSoonTrigger(
  league: League,
  daysThreshold: number = 3
): boolean {
  if (league.status !== "READY" && league.status !== "RUNNING") {
    return false;
  }
  
  const startDate = new Date(league.startDate).getTime();
  const now = Date.now();
  const daysLeft = Math.floor((startDate - now) / (24 * 60 * 60 * 1000));
  
  return daysLeft > 0 && daysLeft <= daysThreshold;
}

/**
 * 팀 모집 트리거 확인
 */
export function checkTeamRecruitTrigger(team: Team): boolean {
  return team.recruitStatus === "OPEN";
}

/**
 * 구장 할인 트리거 확인
 */
export function checkGroundDiscountTrigger(
  ground: Ground,
  discountThreshold: number = 0.1
): boolean {
  // 실제 구현: ground.discountRate 또는 ground.promoPrice 확인
  // 임시: 항상 false
  return false;
}

/**
 * 장기 미접속 트리거 확인
 */
export function checkInactiveTrigger(
  lastActiveAt: string,
  daysThreshold: number = 7
): boolean {
  const lastActive = new Date(lastActiveAt).getTime();
  const now = Date.now();
  const daysSinceActive = Math.floor((now - lastActive) / (24 * 60 * 60 * 1000));
  
  return daysSinceActive >= daysThreshold;
}

/**
 * 경기 리마인드 트리거 확인
 */
export function checkMatchReminderTrigger(
  matchTime: string,
  hoursBefore: number = 24
): boolean {
  const match = new Date(matchTime).getTime();
  const now = Date.now();
  const hoursUntilMatch = (match - now) / (1000 * 60 * 60);
  
  return hoursUntilMatch > 0 && hoursUntilMatch <= hoursBefore;
}

/**
 * 트리거별 메시지 생성
 */
export function generateTriggerMessage(
  trigger: CampaignTrigger,
  context: {
    league?: League;
    team?: Team;
    ground?: Ground;
    daysLeft?: number;
    hoursLeft?: number;
  }
): string {
  switch (trigger) {
    case "league_soon":
      return context.daysLeft
        ? `이번 주 우리 동네 대회, ${context.daysLeft}일 후 시작합니다`
        : "이번 주 우리 동네 대회, 자리 남았습니다";
    
    case "team_recruit":
      return context.team
        ? `${context.team.name} 팀원 모집 중입니다`
        : "같이 뛸 팀을 찾았어요";
    
    case "ground_discount":
      return "오늘만 예약 10% 할인";
    
    case "inactive":
      return "새로운 일정이 생겼어요";
    
    case "match_reminder":
      return context.hoursLeft
        ? `경기 ${Math.floor(context.hoursLeft)}시간 전입니다`
        : "오늘 경기가 있어요";
    
    case "reservation_confirm":
      return "예약이 완료되었습니다";
    
    default:
      return "축구 허브에서 새로운 소식이 있어요";
  }
}
