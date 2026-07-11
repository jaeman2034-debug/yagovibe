/**
 * Vision v6-4 — shared coach dashboard state for Vision cards (reusable outside PlayTab)
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCoachVisionAnalysis } from "@/hooks/useCoachVisionAnalysis";
import type { CoachDashboardVisionProviderView } from "@/lib/vision/visionTypes";

export type VisionCoachSurfaceVariant = "light" | "dark";

export type VisionCardUiState = "loading" | "ready" | "empty" | "error";

type VisionCoachDashboardContextValue = {
  teamId: string;
  matchId: string;
  variant: VisionCoachSurfaceVariant;
  loading: boolean;
  error: string | null;
  hasAnalysis: boolean;
  view: CoachDashboardVisionProviderView | null;
  cardState: VisionCardUiState;
};

const VisionCoachDashboardContext = createContext<VisionCoachDashboardContextValue | null>(
  null
);

export function useVisionCoachDashboard(): VisionCoachDashboardContextValue {
  const ctx = useContext(VisionCoachDashboardContext);
  if (!ctx) {
    throw new Error("useVisionCoachDashboard must be used within VisionCoachDashboardProvider");
  }
  return ctx;
}

type Props = {
  teamId: string;
  matchId: string;
  variant?: VisionCoachSurfaceVariant;
  enabled?: boolean;
  children: ReactNode;
};

export function VisionCoachDashboardProvider({
  teamId,
  matchId,
  variant = "light",
  enabled = true,
  children,
}: Props) {
  const { loading, error, view, hasAnalysis } = useCoachVisionAnalysis(
    teamId,
    matchId,
    enabled
  );

  const cardState: VisionCardUiState = useMemo(() => {
    if (loading) return "loading";
    if (error) return "error";
    if (!hasAnalysis || !view) return "empty";
    return "ready";
  }, [loading, error, hasAnalysis, view]);

  const value = useMemo(
    () => ({
      teamId,
      matchId,
      variant,
      loading,
      error,
      hasAnalysis,
      view,
      cardState,
    }),
    [teamId, matchId, variant, loading, error, hasAnalysis, view, cardState]
  );

  return (
    <VisionCoachDashboardContext.Provider value={value}>
      {children}
    </VisionCoachDashboardContext.Provider>
  );
}
