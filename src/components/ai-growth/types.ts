export type GrowthConfidence = "HIGH" | "MEDIUM" | "LOW";

export type GrowthReviewStatus = "candidate" | "confirmed" | "rejected";

export type CanonicalGrowthEventKey = "SCAN" | "PRESS_RESIST" | "QUICK_RECOVERY";

/** GEV v1 15종 — Step3 표시용 (Core 3축은 eventType 유지) */
export type GevV1EventKey =
  | "SPACE_CREATION"
  | "SUPPORT_ANGLE"
  | "PENETRATION"
  | "PRESSING"
  | "PRESS_ESCAPE"
  | "TRANSITION"
  | "COVER"
  | "OVERLAP"
  | "UNDERLAP"
  | "FORWARD_PASS"
  | "BACK_SUPPORT"
  | "BALL_PROTECTION"
  | "LINE_BREAKING"
  | "SECOND_BALL"
  | "COMMUNICATION";

export type TranscriptSegment = {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

export type GrowthEvent = {
  id: string;
  eventType: CanonicalGrowthEventKey;
  /** GEV v1 15종 활성화 시 세부 이벤트 키 */
  gevV1Key?: GevV1EventKey;
  timestampStart: number;
  timestampEnd?: number;
  confidence: GrowthConfidence;
  reviewStatus: GrowthReviewStatus;
  transcriptStart: number;
  transcriptEnd: number;
  evidence: string;
  guardianPhrase: string;
  coachNote?: string;
};

export type MockGrowthEvent = GrowthEvent;

export type ConsoleTabId =
  | "overview"
  | "method1"
  | "method2"
  | "coach-review"
  | "guardian-preview"
  | "gap";
