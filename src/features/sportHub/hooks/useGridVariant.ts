/**
 * 🔥 useGridVariant - ActionGrid AB 테스트 훅
 */

import { useMemo } from "react";
import { getAssignment } from "../domain/experiment.assign";
import type { ExperimentAssignment } from "../domain/experiment.types";

/**
 * Grid 순서 실험 할당
 */
export function useGridVariant(userId?: string | null): ExperimentAssignment {
  return useMemo(() => getAssignment("hub_grid_order", userId), [userId]);
}
