/**
 * 🔥 Onboarding Flow - 온보딩 플로우 로직
 * 
 * 4단계 온보딩 구조
 */

import type { OnboardingState, OnboardingStep } from "./onboarding.types";
import type { Region } from "./region.types";

/**
 * 단계별 목표 일수
 */
const STEP_DAYS: Record<OnboardingStep, number> = {
  select_region: 0,
  welcome: 1,
  engage: 3,
  settle: 7,
};

/**
 * 현재 단계 계산
 */
export function calculateCurrentStep(state: OnboardingState): OnboardingStep {
  const startedAt = new Date(state.startedAt).getTime();
  const now = Date.now();
  const daysSinceStart = Math.floor((now - startedAt) / (24 * 60 * 60 * 1000));

  // 완료 조건 확인
  if (state.hasSubscribedLeague && state.hasJoinedTeam) {
    return "settle"; // 완료
  }

  // 일수 기반 단계
  if (daysSinceStart >= STEP_DAYS.settle) {
    return "settle";
  } else if (daysSinceStart >= STEP_DAYS.engage) {
    return "engage";
  } else if (daysSinceStart >= STEP_DAYS.welcome) {
    return "welcome";
  } else {
    return "select_region";
  }
}

/**
 * 다음 단계로 진행 가능 여부
 */
export function canProgressToNextStep(
  currentStep: OnboardingStep,
  state: OnboardingState
): boolean {
  switch (currentStep) {
    case "select_region":
      return state.hasSelectedRegion;
    case "welcome":
      return (
        state.hasViewedStories &&
        state.hasViewedGrounds &&
        state.sessionCount >= 2
      );
    case "engage":
      return (
        state.hasViewedTeams &&
        (state.hasMadeReservation || state.hasJoinedTeam)
      );
    case "settle":
      return state.hasSubscribedLeague && state.hasJoinedTeam;
    default:
      return false;
  }
}

/**
 * 온보딩 상태 업데이트
 */
export function updateOnboardingState(
  state: OnboardingState,
  updates: Partial<OnboardingState>
): OnboardingState {
  const updated = {
    ...state,
    ...updates,
    lastActiveAt: new Date().toISOString(),
  };

  // 단계 재계산
  updated.step = calculateCurrentStep(updated);

  // 완료 체크
  if (updated.step === "settle" && !updated.completedAt) {
    updated.completedAt = new Date().toISOString();
  }

  return updated;
}

/**
 * 초기 온보딩 상태 생성
 */
export function createInitialOnboardingState(region: Region): OnboardingState {
  const now = new Date().toISOString();
  
  return {
    region,
    step: "select_region",
    startedAt: now,
    lastActiveAt: now,
    hasSelectedRegion: false,
    hasViewedStories: false,
    hasViewedGrounds: false,
    hasViewedTeams: false,
    hasMadeReservation: false,
    hasJoinedTeam: false,
    hasSubscribedLeague: false,
    sessionCount: 1,
    storyViews: 0,
    groundViews: 0,
    teamViews: 0,
  };
}

/**
 * 온보딩 진행률 계산 (0-100)
 */
export function calculateOnboardingProgress(state: OnboardingState): number {
  const milestones = [
    state.hasSelectedRegion,
    state.hasViewedStories,
    state.hasViewedGrounds,
    state.hasViewedTeams,
    state.hasMadeReservation || state.hasJoinedTeam,
    state.hasSubscribedLeague,
  ];

  const completed = milestones.filter(Boolean).length;
  return Math.round((completed / milestones.length) * 100);
}
