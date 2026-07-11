/**
 * Vision v6-6 — Parent Intelligence (single ViewModel · guardian-friendly)
 */

import type { PeerBenchmarkPayload } from "@/lib/vision/peerBenchmarkFromPlayerFii";

export type ParentIntelligenceSummary = {
  playerName: string;
  teamName: string;
  matchLabel: string | null;
};

export type ParentIntelligenceExplainable = {
  title: string;
  bullets: string[];
};

/** Parent-facing ViewModel — UI consumes this only (no Coach labels / version badge) */
export type ParentIntelligenceView = {
  summary: ParentIntelligenceSummary;
  /** Opening narrative (match + growth context) */
  narrativeSummary: string;
  /** Explainable AI — why the match went well */
  explainable: ParentIntelligenceExplainable;
  /** Encouragement · emotion (1 sentence) */
  emotionSummary: string;
  /** Single actionable recommendation for parents */
  recommendation: string;
  /** Reused growth narrative strengths (optional merge) */
  strengths: string[];
  matchSummary: string | null;
  hasVisionAnalysis: boolean;
  /** RC4-4 M4 — from fii_summary parentInsights */
  fiiDataSource?: "fii_summary" | "firestore";
  sessionSummary?: string;
  growthHighlight?: string;
  encouragement?: string;
  nextTraining?: string;
  teamFiiScore?: number | null;
  /** VOC-011 — team·ageGroup peer FII baseline (null = 미노출) */
  peerBenchmark?: PeerBenchmarkPayload | null;
};

export type ParentIntelligenceLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; message: string }
  | { status: "ready"; view: ParentIntelligenceView };
