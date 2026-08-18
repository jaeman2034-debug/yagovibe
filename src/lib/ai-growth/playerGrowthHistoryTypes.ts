import type { ReportTone } from "@/components/ai-growth/guardianNarrative";
import type { GrowthScoreSnapshot } from "@/lib/ai-growth/growthScore";

export const PLAYER_GROWTH_HISTORY_SCHEMA_VERSION = 1 as const;
export const GROWTH_REPORT_DELIVERY_SCHEMA_VERSION = 1 as const;

/** Sprint D-1.1a — CF auto-notify metadata on delivery */
export type GrowthReportDeliveryAutoNotify = {
  schemaVersion: 1;
  sentAt: number;
  parentUids: string[];
  channel: "in_app" | "push";
  notificationIds?: string[];
};

/** Sprint D-1 — PDF delivery metadata on session doc */
export type GrowthReportDelivery = {
  schemaVersion: typeof GROWTH_REPORT_DELIVERY_SCHEMA_VERSION;
  pdfStoragePath: string;
  pdfDownloadUrl: string;
  pdfGeneratedAt: number;
  pdfFilename: string;
  generatedByUid: string;
  sharePath: string;
  notifiedParentUids: string[];
  sharedAt: number | null;
  firstViewedAt?: Record<string, number>;
  autoNotify?: GrowthReportDeliveryAutoNotify;
};

export type GrowthTrendWindow = "7d" | "30d" | "season";

export type PlayerGrowthSessionMetrics = {
  scanCount: number;
  pressureResistanceCount: number;
  recoveryCount: number;
  confirmedRatio: number;
  editedRatio: number;
  verifiedEventCount: number;
  /** 코치 검증 이벤트 기반 0~100 (SCAN 40% · PRESS 35% · RECOVERY 25%) */
  growthScore?: GrowthScoreSnapshot;
};

export type StoredVerifiedEvent = {
  action: "confirmed" | "rejected" | "edited";
  eventId: string;
  eventType: string;
  eventTimestampStart: number;
  eventTimestampEnd: number;
  evidence: string;
  transcript: string;
  confidence: string;
  coachNote?: string;
  videoTimestamp: number;
  savedAt: number;
};

/** Canonical Firestore document: teams/{teamId}/playerGrowthHistory/{sessionId} */
export type PlayerGrowthSessionDoc = {
  schemaVersion: typeof PLAYER_GROWTH_HISTORY_SCHEMA_VERSION;
  /** Firestore document ID — Parent View `/growth-report/:id` 라우트용 */
  firestoreDocId: string;
  sessionId: string;
  playerId: string;
  playerName: string;
  videoId: string | null;
  generatedAt: number;
  reviewedBy: string;
  tone: ReportTone;
  verifiedEvents: StoredVerifiedEvent[];
  metrics: PlayerGrowthSessionMetrics;
  delivery?: GrowthReportDelivery;
};

export type GrowthTrendDashboard = {
  window: GrowthTrendWindow;
  sessionCount: number;
  aggregated: PlayerGrowthSessionMetrics;
  scanTrendPct: number | null;
  pressureTrendPct: number | null;
  recoveryTrendPct: number | null;
  confirmedRatioAvg: number;
  narratives: string[];
};
