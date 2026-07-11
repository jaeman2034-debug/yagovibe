/**
 * Vision RC4-4 M4 — Parent Intelligence context + optional fii_summary metadata
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useParentIntelligence } from "@/hooks/useParentIntelligence";
import type {
  ParentIntelligenceLoadState,
  ParentIntelligenceView,
} from "@/lib/vision/parentIntelligenceTypes";

type ParentIntelligenceContextValue = {
  state: ParentIntelligenceLoadState;
  view: ParentIntelligenceView | null;
  isFiiSummarySource: boolean;
};

const ParentIntelligenceContext = createContext<ParentIntelligenceContextValue | null>(
  null
);

export function useParentIntelligenceView(): ParentIntelligenceContextValue {
  const ctx = useContext(ParentIntelligenceContext);
  if (!ctx) {
    throw new Error(
      "useParentIntelligenceView must be used within ParentIntelligenceProvider"
    );
  }
  return ctx;
}

type Props = {
  teamId: string;
  playerId: string;
  playerName?: string;
  matchId?: string | null;
  trackId?: string;
  enabled?: boolean;
  children: ReactNode;
};

export function ParentIntelligenceProvider({
  teamId,
  playerId,
  playerName,
  matchId,
  trackId,
  enabled = true,
  children,
}: Props) {
  const state = useParentIntelligence({
    teamId,
    playerId,
    playerName,
    matchId,
    trackId,
    enabled,
  });

  const view = state.status === "ready" ? state.view : null;

  const value = useMemo(
    () => ({
      state,
      view,
      isFiiSummarySource: view?.fiiDataSource === "fii_summary",
    }),
    [state, view]
  );

  return (
    <ParentIntelligenceContext.Provider value={value}>
      {children}
    </ParentIntelligenceContext.Provider>
  );
}
