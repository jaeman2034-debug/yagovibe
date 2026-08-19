import { createContext, useContext } from "react";
import type { TeamMatchBridge } from "@/lib/team/teamMatchBridge";

export const TeamMatchBridgeContext = createContext<TeamMatchBridge | null>(null);

export function useTeamMatchBridgeContext(): TeamMatchBridge | null {
  return useContext(TeamMatchBridgeContext);
}
