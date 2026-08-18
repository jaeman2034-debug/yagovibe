/** Sprint H-1.1 — Federation Dashboard */

import type { AcademyIntelligenceSnapshot } from "@/lib/ai-growth/multiAcademyDashboardTypes";

export type FederationIntelligenceSnapshot = {
  federationId: string;
  federationName: string;
  academyCount: number;
  playerCount: number;
  trackedPlayers: number;
  avgOvr: number | null;
  avgGrowthRate: number | null;
  atRiskPlayerCount: number;
  activeCoachCount: number;
  academies: AcademyIntelligenceSnapshot[];
};

export type FederationDashboardKpi = {
  federationCount: number;
  academyCount: number;
  playerCount: number;
  trackedPlayers: number;
  avgOvr: number | null;
  avgGrowthRate: number | null;
  atRiskPlayerCount: number;
};

export type FederationDashboardRow = {
  federationId: string;
  federationName: string;
  academyCount: number;
  playerCount: number;
  trackedPlayers: number;
  avgOvr: number | null;
  avgGrowthRate: number | null;
  atRiskPlayerCount: number;
};

export type FederationDashboardResult = {
  headline: string;
  subline: string | null;
  kpi: FederationDashboardKpi;
  federations: FederationDashboardRow[];
  isEmpty?: boolean;
};
