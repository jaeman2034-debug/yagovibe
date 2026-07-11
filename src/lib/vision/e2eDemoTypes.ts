/**
 * RC4-6 M6 — E2E demo summary types
 */

export const E2E_DEMO_SCHEMA = "yago-vision-rc4-e2e-demo-v1" as const;

export type E2EDemoStepStatus = "pass" | "fail" | "pending" | "running";

export type E2EDemoStep = {
  id: string;
  label: string;
  status: E2EDemoStepStatus;
  detail?: string;
  artifact?: string | null;
  route?: string;
};

export type E2EDemoGates = {
  upload: boolean;
  tracking: boolean;
  gev: boolean;
  fii: boolean;
  coachUi: boolean;
  parentUi: boolean;
  timeline: boolean;
  platformUi: boolean;
  rc4_6_pass: boolean;
};

export type E2EDemoSummary = {
  schemaVersion: typeof E2E_DEMO_SCHEMA;
  milestone: string;
  phase: string;
  date: string;
  verdict: "PASS" | "FAIL";
  clipId: string;
  pilotMatchId: string;
  productionPreset: string;
  runDir: string;
  source: string;
  envFlag: string;
  gates: E2EDemoGates;
  steps: E2EDemoStep[];
  metrics?: {
    personRows?: number;
    gevEvents?: number;
    teamFii?: number | null;
    playerCount?: number;
    latency?: Record<string, number>;
  };
  uiSurfaces: Record<string, string>;
};

export type E2EDemoLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: E2EDemoSummary };
