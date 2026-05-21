/**
 * 🔥 useStoryZoneVariant - StoryZone AB 테스트 훅
 */

import { useMemo } from "react";
import { getAssignment } from "../domain/experiment.assign";
import type { ExperimentAssignment } from "../domain/experiment.types";

/**
 * StoryZone 레이아웃 실험 할당
 */
export function useStoryZoneVariant(userId?: string | null): ExperimentAssignment {
  return useMemo(() => getAssignment("hub_storyzone_layout", userId), [userId]);
}
