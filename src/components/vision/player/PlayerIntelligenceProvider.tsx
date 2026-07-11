/**
 * Vision v6-5 — Player Intelligence context (UI reads ViewModel only)
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePlayerIntelligence } from "@/hooks/usePlayerIntelligence";
import type {
  PlayerIntelligenceLoadState,
  PlayerIntelligencePersona,
  PlayerIntelligenceView,
} from "@/lib/vision/playerIntelligenceTypes";

type PlayerIntelligenceContextValue = {
  state: PlayerIntelligenceLoadState;
  view: PlayerIntelligenceView | null;
};

const PlayerIntelligenceContext = createContext<PlayerIntelligenceContextValue | null>(
  null
);

export function usePlayerIntelligenceView(): PlayerIntelligenceContextValue {
  const ctx = useContext(PlayerIntelligenceContext);
  if (!ctx) {
    throw new Error("usePlayerIntelligenceView must be used within PlayerIntelligenceProvider");
  }
  return ctx;
}

type Props = {
  teamId: string;
  playerId: string;
  playerName?: string;
  matchId?: string | null;
  trackId?: string;
  persona: PlayerIntelligencePersona;
  enabled?: boolean;
  children: ReactNode;
};

export function PlayerIntelligenceProvider({
  teamId,
  playerId,
  playerName,
  matchId,
  trackId,
  persona,
  enabled = true,
  children,
}: Props) {
  const state = usePlayerIntelligence({
    teamId,
    playerId,
    playerName,
    matchId,
    trackId,
    persona,
    enabled,
  });

  const value = useMemo(
    () => ({
      state,
      view: state.status === "ready" ? state.view : null,
    }),
    [state]
  );

  return (
    <PlayerIntelligenceContext.Provider value={value}>
      {children}
    </PlayerIntelligenceContext.Provider>
  );
}
