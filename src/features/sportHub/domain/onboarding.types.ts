/**
 * 🔥 Onboarding Types - 지역 온보딩 도메인 모델
 * 
 * 새 도시를 7일 안에 살아있는 허브로 만드는 운영 시나리오
 */

import type { Region } from "./region.types";

/**
 * 온보딩 단계
 */
export type OnboardingStep =
  | "select_region"  // Stage 0: 지역 선택
  | "welcome"        // Stage 1: 신뢰 (1일)
  | "engage"         // Stage 2: 참여 (3일)
  | "settle";        // Stage 3: 정착 (7일)

/**
 * 온보딩 상태
 */
export type OnboardingState = {
  userId?: string;
  region: Region;
  step: OnboardingStep;
  startedAt: string;      // ISO string
  lastActiveAt: string;   // ISO string
  completedAt?: string;    // ISO string
  
  // 진행 상황
  hasSelectedRegion: boolean;
  hasViewedStories: boolean;
  hasViewedGrounds: boolean;
  hasViewedTeams: boolean;
  hasMadeReservation: boolean;
  hasJoinedTeam: boolean;
  hasSubscribedLeague: boolean;
  
  // 메트릭
  sessionCount: number;
  storyViews: number;
  groundViews: number;
  teamViews: number;
};

/**
 * 온보딩 콘텐츠 세트 (Day0)
 */
export type OnboardingContentSet = {
  stories: {
    assocLeague: number;    // 협회 대회 2개
    opsPick: number;        // 운영 픽 2개
    user: number;           // 사용자 1개
  };
  grounds: number;          // 추천 구장 3곳
  teams: number;            // 팀 모집 2건
  market: number;           // 마켓 기본 5개
};

/**
 * 웰컴 메시지
 */
export type WelcomeMessage = {
  title: string;
  subtitle: string;
  cta: string;
  variant: "default" | "first_reservation" | "team_join" | "league_subscribe";
};
