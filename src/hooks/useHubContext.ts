/**
 * 🔥 useHubContext - 허브 컨텍스트 사용 훅
 * 
 * 역할:
 * - HubContext의 편의 래퍼
 * - 타입 안전성 보장
 * - 자주 사용되는 패턴 제공
 * 
 * 사용 예시:
 * ```tsx
 * const { activeSport, setActiveSport, activityFocus } = useHubContext();
 * ```
 */

import { useHubContext as useHubContextInternal } from "@/context/HubContext";
import type { SportType, ActivityFocus } from "@/context/HubContext";

/**
 * 🔥 기본 허브 컨텍스트 훅
 */
export function useHubContext() {
  return useHubContextInternal();
}

/**
 * 🔥 현재 활성 종목만 가져오는 훅
 */
export function useActiveSport() {
  const { activeSport, setActiveSport } = useHubContextInternal();
  return { activeSport, setActiveSport };
}

/**
 * 🔥 현재 Activity 포커스만 가져오는 훅
 */
export function useActivityFocus() {
  const { activityFocus, setActivityFocus } = useHubContextInternal();
  return { activityFocus, setActivityFocus };
}

/**
 * 🔥 위치 컨텍스트만 가져오는 훅
 */
export function useHubLocation() {
  const { currentLocation, locationAccuracy, updateLocation } = useHubContextInternal();
  return { currentLocation, locationAccuracy, updateLocation };
}

/**
 * 🔥 시간 컨텍스트만 가져오는 훅
 */
export function useTimeContext() {
  const { timeContext } = useHubContextInternal();
  return { timeContext };
}

/**
 * 🔥 선호 종목 관리 훅
 */
export function usePreferredSports() {
  const { preferredSports, updatePreferredSports } = useHubContextInternal();
  return { preferredSports, updatePreferredSports };
}

/**
 * 🔥 허브 상태 체크 훅
 */
export function useHubStatus() {
  const { isHubActive, lastActivity } = useHubContextInternal();
  return { isHubActive, lastActivity };
}

/**
 * 🔥 Activity 포커스가 특정 값인지 체크하는 훅
 */
export function useIsActivityFocus(focus: ActivityFocus) {
  const { activityFocus } = useHubContextInternal();
  return activityFocus === focus;
}

/**
 * 🔥 특정 종목이 활성화되어 있는지 체크하는 훅
 */
export function useIsSportActive(sport: SportType) {
  const { activeSport } = useHubContextInternal();
  return activeSport === sport;
}
