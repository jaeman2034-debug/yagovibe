/**
 * 🔥 useOnboarding - 온보딩 상태 관리 훅
 */

import { useEffect, useState } from "react";
import type { OnboardingState, OnboardingStep } from "../domain/onboarding.types";
import type { Region } from "../domain/region.types";
import {
  createInitialOnboardingState,
  updateOnboardingState,
  calculateCurrentStep,
  canProgressToNextStep,
} from "../domain/onboarding.flow";
import {
  saveOnboardingState,
  loadOnboardingState,
} from "../data/onboarding.storage";
import { logOnboardingMetric } from "../domain/onboarding.metrics";
import { useRegion } from "../context/RegionContext";

export function useOnboarding() {
  const region = useRegion();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    const saved = loadOnboardingState();
    
    if (saved && saved.region === region) {
      // 기존 상태가 있고 지역이 같으면 복원
      const updated = {
        ...saved,
        step: calculateCurrentStep(saved),
      };
      setState(updated);
      saveOnboardingState(updated);
    } else {
      // 새 지역이면 초기화
      const initial = createInitialOnboardingState(region);
      setState(initial);
      saveOnboardingState(initial);
      logOnboardingMetric(initial, "session_started");
    }
    
    setLoading(false);
  }, [region]);

  // 상태 업데이트
  const updateState = (updates: Partial<OnboardingState>) => {
    if (!state) return;
    
    const updated = updateOnboardingState(state, updates);
    setState(updated);
    saveOnboardingState(updated);
  };

  // 이벤트 기록
  const trackEvent = (
    event: Parameters<typeof logOnboardingMetric>[1],
    metadata?: Record<string, any>
  ) => {
    if (!state) return;
    
    logOnboardingMetric(state, event, metadata);
    
    // 상태 자동 업데이트
    switch (event) {
      case "region_selected":
        updateState({ hasSelectedRegion: true });
        break;
      case "story_viewed":
        updateState({
          hasViewedStories: true,
          storyViews: state.storyViews + 1,
        });
        break;
      case "ground_viewed":
        updateState({
          hasViewedGrounds: true,
          groundViews: state.groundViews + 1,
        });
        break;
      case "team_viewed":
        updateState({
          hasViewedTeams: true,
          teamViews: state.teamViews + 1,
        });
        break;
      case "reservation_made":
        updateState({ hasMadeReservation: true });
        break;
      case "team_joined":
        updateState({ hasJoinedTeam: true });
        break;
      case "league_subscribed":
        updateState({ hasSubscribedLeague: true });
        break;
      case "session_started":
        updateState({
          sessionCount: state.sessionCount + 1,
        });
        break;
    }
  };

  // 다음 단계로 진행 가능 여부
  const canProgress = state ? canProgressToNextStep(state.step, state) : false;

  return {
    state,
    loading,
    updateState,
    trackEvent,
    canProgress,
  };
}
