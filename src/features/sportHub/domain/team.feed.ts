/**
 * 🔥 Team Feed - 팀 커뮤니티 피드
 * 
 * 경기 결과, 모집 글, 사진, 공지
 */

import type { Team, TeamSchedule } from "./team.types";
import type { Match } from "./league.types";

/**
 * 피드 아이템 타입
 */
export type TeamFeedItemType = "match_result" | "recruitment" | "photo" | "announcement" | "schedule";

/**
 * 팀 피드 아이템
 */
export type TeamFeedItem = {
  id: string;
  teamId: string;
  type: TeamFeedItemType;
  title: string;
  content?: string;
  imageUrl?: string;
  createdAt: string;
  authorId: string;
  
  // 타입별 데이터
  matchId?: string;
  scheduleId?: string;
  likes?: number;
  comments?: number;
};

/**
 * 경기 결과 피드 생성
 */
export function createMatchResultFeedItem(
  team: Team,
  match: Match,
  isHome: boolean
): TeamFeedItem {
  const opponent = isHome ? match.awayTeamId : match.homeTeamId;
  const teamScore = isHome ? match.result?.home : match.result?.away;
  const opponentScore = isHome ? match.result?.away : match.result?.home;
  
  return {
    id: `feed-match-${match.id}`,
    teamId: team.id,
    type: "match_result",
    title: match.result?.isDraw
      ? "무승부"
      : match.result?.winner === (isHome ? "home" : "away")
      ? "승리"
      : "패배",
    content: `${teamScore} : ${opponentScore}`,
    createdAt: match.updatedAt,
    authorId: "system",
    matchId: match.id,
  };
}

/**
 * 일정 피드 생성
 */
export function createScheduleFeedItem(
  team: Team,
  schedule: TeamSchedule
): TeamFeedItem {
  return {
    id: `feed-schedule-${schedule.id}`,
    teamId: team.id,
    type: "schedule",
    title: schedule.title,
    content: schedule.type === "match" ? "경기 일정" : "훈련 일정",
    createdAt: schedule.date,
    authorId: "system",
    scheduleId: schedule.id,
  };
}

/**
 * 팀 피드 조회 (최신순)
 */
export function getTeamFeed(
  team: Team,
  matches: Match[],
  limit: number = 20
): TeamFeedItem[] {
  const items: TeamFeedItem[] = [];
  
  // 경기 결과
  for (const match of matches) {
    if (match.status === "completed" && match.result) {
      const isHome = match.homeTeamId === team.id;
      if (isHome || match.awayTeamId === team.id) {
        items.push(createMatchResultFeedItem(team, match, isHome));
      }
    }
  }
  
  // 일정
  for (const schedule of team.schedule) {
    if (schedule.status === "scheduled") {
      items.push(createScheduleFeedItem(team, schedule));
    }
  }
  
  // 최신순 정렬
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return items.slice(0, limit);
}
