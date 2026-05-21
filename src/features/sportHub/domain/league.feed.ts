/**
 * 🔥 League Feed - 리그 커뮤니티 피드
 * 
 * 대진표, 랭킹, 하이라이트
 */

import type { League, LeagueRanking, Match } from "./league.types";
import type { Team } from "./team.types";

/**
 * 리그 피드 아이템 타입
 */
export type LeagueFeedItemType = "fixture" | "ranking" | "highlight" | "announcement";

/**
 * 리그 피드 아이템
 */
export type LeagueFeedItem = {
  id: string;
  leagueId: string;
  type: LeagueFeedItemType;
  title: string;
  content?: string;
  imageUrl?: string;
  createdAt: string;
  
  // 타입별 데이터
  matchId?: string;
  ranking?: LeagueRanking[];
  fixture?: Match[];
};

/**
 * 대진표 피드 생성
 */
export function createFixtureFeedItem(
  league: League,
  upcomingMatches: Match[]
): LeagueFeedItem {
  return {
    id: `feed-fixture-${league.id}`,
    leagueId: league.id,
    type: "fixture",
    title: "다음 경기 일정",
    content: `${upcomingMatches.length}경기 예정`,
    createdAt: new Date().toISOString(),
    fixture: upcomingMatches,
  };
}

/**
 * 랭킹 피드 생성
 */
export function createRankingFeedItem(
  league: League,
  ranking: LeagueRanking[]
): LeagueFeedItem {
  return {
    id: `feed-ranking-${league.id}`,
    leagueId: league.id,
    type: "ranking",
    title: "리그 랭킹",
    content: `${ranking.length}개 팀`,
    createdAt: new Date().toISOString(),
    ranking,
  };
}

/**
 * 하이라이트 피드 생성
 */
export function createHighlightFeedItem(
  league: League,
  match: Match,
  highlightUrl?: string
): LeagueFeedItem {
  return {
    id: `feed-highlight-${match.id}`,
    leagueId: league.id,
    type: "highlight",
    title: "경기 하이라이트",
    content: `${match.homeTeamId} vs ${match.awayTeamId}`,
    imageUrl: highlightUrl,
    createdAt: match.updatedAt,
    matchId: match.id,
  };
}

/**
 * 리그 피드 조회
 */
export function getLeagueFeed(
  league: League,
  ranking: LeagueRanking[],
  matches: Match[]
): LeagueFeedItem[] {
  const items: LeagueFeedItem[] = [];
  
  // 랭킹
  if (ranking.length > 0) {
    items.push(createRankingFeedItem(league, ranking));
  }
  
  // 다가오는 경기
  const upcoming = matches.filter(
    (m) => m.status === "scheduled" && new Date(m.scheduledAt) > new Date()
  );
  if (upcoming.length > 0) {
    items.push(createFixtureFeedItem(league, upcoming));
  }
  
  // 최근 완료된 경기 (하이라이트)
  const recentCompleted = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  
  for (const match of recentCompleted) {
    items.push(createHighlightFeedItem(league, match));
  }
  
  // 최신순 정렬
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return items;
}
