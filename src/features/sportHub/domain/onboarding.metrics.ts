/**
 * 🔥 Onboarding Metrics - 온보딩 핵심 지표 추적
 * 
 * D1 재방문 ≥ 28%
 * 첫 세션 전환 ≥ 18%
 * 스토리 존 공백 0
 * 7일 내 예약 1건 이상
 */

import type { OnboardingState } from "./onboarding.types";

/**
 * 온보딩 이벤트
 */
export type OnboardingEvent =
  | "region_selected"
  | "story_viewed"
  | "ground_viewed"
  | "team_viewed"
  | "reservation_made"
  | "team_joined"
  | "league_subscribed"
  | "session_started"
  | "session_ended";

/**
 * 온보딩 메트릭 로그
 */
export type OnboardingMetricLog = {
  userId?: string;
  region: string;
  event: OnboardingEvent;
  step: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

/**
 * 메트릭 로그 기록
 */
export function logOnboardingMetric(
  state: OnboardingState,
  event: OnboardingEvent,
  metadata?: Record<string, any>
): void {
  const log: OnboardingMetricLog = {
    userId: state.userId,
    region: state.region,
    event,
    step: state.step,
    timestamp: new Date().toISOString(),
    metadata,
  };

  // 1차: 콘솔
  console.log("[ONBOARDING_METRIC]", log);

  // 2차: 추후 API 연결
  // queueLogToOfflineAndFlush("/api/onboarding/metric", log);
}

/**
 * D1 재방문률 계산
 */
export function calculateD1ReturnRate(
  states: OnboardingState[]
): number {
  const d1Users = states.filter((s) => {
    const startedAt = new Date(s.startedAt).getTime();
    const lastActive = new Date(s.lastActiveAt).getTime();
    const daysDiff = Math.floor((lastActive - startedAt) / (24 * 60 * 60 * 1000));
    return daysDiff >= 1 && s.sessionCount >= 2;
  });

  return states.length > 0 ? (d1Users.length / states.length) * 100 : 0;
}

/**
 * 첫 세션 전환률 계산
 */
export function calculateFirstSessionConversion(
  states: OnboardingState[]
): number {
  const converted = states.filter(
    (s) => s.hasMadeReservation || s.hasJoinedTeam || s.hasSubscribedLeague
  );

  return states.length > 0 ? (converted.length / states.length) * 100 : 0;
}

/**
 * 7일 내 예약률 계산
 */
export function calculate7DayReservationRate(
  states: OnboardingState[]
): number {
  const withReservation = states.filter((s) => {
    if (!s.hasMadeReservation) return false;
    const startedAt = new Date(s.startedAt).getTime();
    const completedAt = s.completedAt
      ? new Date(s.completedAt).getTime()
      : Date.now();
    const daysDiff = Math.floor((completedAt - startedAt) / (24 * 60 * 60 * 1000));
    return daysDiff <= 7;
  });

  return states.length > 0 ? (withReservation.length / states.length) * 100 : 0;
}

/**
 * 온보딩 성공 여부 판정
 */
export function isOnboardingSuccessful(state: OnboardingState): boolean {
  return (
    state.hasSelectedRegion &&
    state.hasViewedStories &&
    (state.hasMadeReservation || state.hasJoinedTeam) &&
    state.sessionCount >= 2
  );
}
