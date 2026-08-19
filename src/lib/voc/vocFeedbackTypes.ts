/** I-2.1 — VOC Feedback (Interview Table v1 schema) */

export type VocPersona = "coach" | "operator" | "parent";
export type VocCaptureMode = "voice" | "text";
export type VocFeatureScreen =
  | "dashboard"
  | "risk"
  | "coach"
  | "operations"
  | "pdf"
  | "parent_report"
  | "growth_demo"
  | "other";

export type VocMemorableScreen =
  | "dashboard"
  | "fii"
  | "training"
  | "pdf"
  | "other";

export type VocFeedbackDoc = {
  schemaVersion: 1;
  source: "interview";
  captureMode: VocCaptureMode;
  persona: VocPersona;
  orgLabel: string;
  feature: VocFeatureScreen;
  interviewMethod?: string;
  ratingUnderstanding: number;
  ratingUsage: number;
  ratingRecommend?: number;
  memorableScreen?: VocMemorableScreen;
  transcript?: string;
  positiveText: string;
  painText: string;
  requestText: string;
  painPoints: string[];
  featureRequests: string[];
  positiveSignals: string[];
  signals: { pain: boolean; request: boolean; value: boolean };
  stt?: { provider: string; model: string; language: string };
  capturedAt: unknown;
  capturedByUid: string;
};

export const VOC_PERSONA_LABELS: Record<VocPersona, string> = {
  coach: "코치",
  operator: "운영자",
  parent: "학부모",
};

export const VOC_FEATURE_LABELS: Record<VocFeatureScreen, string> = {
  dashboard: "Dashboard",
  risk: "Risk",
  coach: "Coach",
  operations: "Operations",
  pdf: "PDF",
  parent_report: "Parent Report",
  growth_demo: "Growth Demo",
  other: "기타",
};
