/**
 * 🔥 Assoc Adapter - 협회 데이터 정규화 및 Story 변환
 * 
 * Week2 핵심: 협회 API → Story 자동 생성
 */

import type { Story, Region } from "./types";

export type AssocLeagueApi = {
  id: string;
  region: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
};

export type AssocNoticeApi = {
  id: string;
  region: string;
  title: string;
  content: string;
  publishedAt: string;
  expiresAt?: string;
};

export type AssocRecruitmentApi = {
  id: string;
  region: string;
  teamName: string;
  position: string;
  level: string;
  publishedAt: string;
  expiresAt?: string;
};

/**
 * 협회 리그 → Story 변환
 */
export function leagueToStory(l: AssocLeagueApi): Story {
  const now = new Date().toISOString();
  const startAt = new Date(l.startDate).toISOString();
  const endAt = new Date(l.endDate).toISOString();

  return {
    id: `assoc-league-${l.id}`,
    region: l.region as Region,

    source: "협회",
    category: "대회",

    title: l.name.length > 40 ? l.name.slice(0, 37) + "..." : l.name,
    subtitle: `${formatDate(l.startDate)} ~ ${formatDate(l.endDate)}`,

    status: "PUBLISHED",

    startAt,
    endAt,

    ctaType: "view_schedule",
    priority: 90,

    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 협회 공지 → Story 변환
 */
export function noticeToStory(n: AssocNoticeApi): Story {
  const now = new Date().toISOString();
  const startAt = new Date(n.publishedAt).toISOString();
  const endAt = n.expiresAt
    ? new Date(n.expiresAt).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `assoc-notice-${n.id}`,
    region: n.region as Region,

    source: "협회",
    category: "협회",

    title: n.title.length > 40 ? n.title.slice(0, 37) + "..." : n.title,
    subtitle: n.content.length > 60 ? n.content.slice(0, 57) + "..." : n.content,

    status: "PUBLISHED",

    startAt,
    endAt,

    ctaType: "view_notice",
    priority: 85,

    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 협회 모집 → Story 변환
 */
export function recruitmentToStory(r: AssocRecruitmentApi): Story {
  const now = new Date().toISOString();
  const startAt = new Date(r.publishedAt).toISOString();
  const endAt = r.expiresAt
    ? new Date(r.expiresAt).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `assoc-recruit-${r.id}`,
    region: r.region as Region,

    source: "협회",
    category: "모집",

    title: `${r.teamName} 모집`,
    subtitle: `${r.position} · ${r.level}`,

    status: "PUBLISHED",

    startAt,
    endAt,

    ctaType: "find_team",
    priority: 80,

    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 날짜 포맷 헬퍼 (YYYY-MM-DD → M월 D일)
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
