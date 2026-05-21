/**
 * 🔥 Team Story Integration - 스토리 존 결합
 * 
 * 팀 모집 → 스토리
 * 리그 일정 → 시즌
 * 경기 임박 → 우선 노출
 */

import type { Story } from "./story.types";
import type { Team } from "./team.types";
import type { League, Match } from "./league.types";
import type { Region } from "./region.types";

/**
 * 팀 모집 → 스토리 변환
 */
export function teamRecruitmentToStory(
  team: Team,
  region: Region
): Story {
  const now = new Date().toISOString();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 7); // 7일간 노출
  
  return {
    id: `team-recruit-${team.id}`,
    region,
    source: "사용자",
    category: "모집",
    title: `${team.name} 팀원 모집`,
    subtitle: team.recruitMessage || `${team.level} 레벨 · ${team.region} 지역`,
    status: "PUBLISHED",
    startAt: now,
    endAt: endDate.toISOString(),
    priority: team.level === "pro" ? 75 : 60,
    score: team.members.length, // 멤버 수가 많을수록 인기
    isVerifiedAuthor: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 리그 일정 → 시즌 스토리 변환
 */
export function leagueToSeasonStory(
  league: League,
  region: Region
): Story {
  const now = new Date().toISOString();
  
  return {
    id: `league-season-${league.id}`,
    region,
    source: league.associationId ? "협회" : "운영",
    category: "대회",
    title: `${league.name} ${league.season}`,
    subtitle: `${league.teams.length}개 팀 참가 · ${league.matches.length}경기`,
    status: "PUBLISHED",
    startAt: league.startDate,
    endAt: league.endDate || new Date(league.startDate).toISOString(),
    priority: league.associationId ? 95 : 85,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 경기 임박 → 우선 노출 스토리
 */
export function upcomingMatchToStory(
  match: Match,
  homeTeam: Team,
  awayTeam: Team,
  region: Region
): Story | null {
  const matchTime = new Date(match.scheduledAt).getTime();
  const now = Date.now();
  const hoursUntilMatch = (matchTime - now) / (1000 * 60 * 60);
  
  // 24시간 이내 경기만 스토리로 노출
  if (hoursUntilMatch < 0 || hoursUntilMatch > 24) {
    return null;
  }
  
  const nowStr = new Date().toISOString();
  const matchDate = new Date(match.scheduledAt);
  matchDate.setHours(matchDate.getHours() + 2); // 경기 종료 후 2시간까지
  
  return {
    id: `match-upcoming-${match.id}`,
    region,
    source: "운영",
    category: "대회",
    title: `${homeTeam.name} vs ${awayTeam.name}`,
    subtitle: `${Math.floor(hoursUntilMatch)}시간 후 경기`,
    status: "PUBLISHED",
    startAt: nowStr,
    endAt: matchDate.toISOString(),
    priority: 100, // 최우선 노출
    createdAt: nowStr,
    updatedAt: nowStr,
  };
}

/**
 * 팀 활동 기반 스토리 우선순위 부스트
 */
export function boostTeamStoryPriority(
  story: Story,
  team: Team
): Story {
  // 팀 레벨에 따른 우선순위 부스트
  const levelBoost: Record<Team["level"], number> = {
    pro: 15,
    normal: 5,
    beginner: 0,
  };
  
  // 멤버 수에 따른 부스트
  const memberBoost = Math.min(team.members.length * 2, 20);
  
  const currentPriority = story.priority || 50;
  const boosted = currentPriority + levelBoost[team.level] + memberBoost;
  
  return {
    ...story,
    priority: Math.min(boosted, 100), // 최대 100
  };
}
