/**
 * 🔥 Experiment Analytics - 집계 규격 및 종료 조건
 * 
 * 실험 결과를 의사결정 지표로 사용
 */

import type { ExperimentKey, Variant } from "./experiment.types";

/**
 * 실험 집계 결과
 */
export type ExperimentMetrics = {
  variant: Variant;
  impression: number;
  click: number;
  route?: number;
  ctr: number; // percentage
  conversion?: number; // route / click
};

/**
 * 종료 조건 설정
 */
export const EXPERIMENT_CRITERIA = {
  // 최소 기준
  minImpression: 3000,
  minDuration: 7 * 24 * 60 * 60 * 1000, // 7일
  minSignificance: 10, // 10% 유의차
  
  // 신뢰도
  minConfidence: 95, // 95% 신뢰도
} as const;

/**
 * CTR 계산
 */
export function calculateCTR(impression: number, click: number): number {
  if (impression === 0) return 0;
  return Math.round((click / impression) * 100 * 100) / 100; // 소수점 2자리
}

/**
 * 전환률 계산
 */
export function calculateConversion(click: number, route: number): number {
  if (click === 0) return 0;
  return Math.round((route / click) * 100 * 100) / 100;
}

/**
 * 실험 종료 조건 확인
 */
export function checkExperimentCriteria(
  metrics: {
    A: ExperimentMetrics;
    B: ExperimentMetrics;
  },
  duration: number // milliseconds
): {
  ready: boolean;
  reason?: string;
} {
  // 최소 노출 확인
  const totalImpression = metrics.A.impression + metrics.B.impression;
  if (totalImpression < EXPERIMENT_CRITERIA.minImpression) {
    return {
      ready: false,
      reason: `최소 노출 미달: ${totalImpression} / ${EXPERIMENT_CRITERIA.minImpression}`,
    };
  }

  // 최소 기간 확인
  if (duration < EXPERIMENT_CRITERIA.minDuration) {
    return {
      ready: false,
      reason: `최소 기간 미달: ${Math.floor(duration / (24 * 60 * 60 * 1000))}일`,
    };
  }

  return { ready: true };
}

/**
 * 승자 판정
 */
export function determineWinner(
  metrics: {
    A: ExperimentMetrics;
    B: ExperimentMetrics;
  }
): {
  winner?: Variant;
  confidence: number;
  recommendation: "continue" | "stop" | "declare_winner";
} {
  const ctrA = metrics.A.ctr;
  const ctrB = metrics.B.ctr;

  // 유의차 계산 (간단한 버전)
  const diff = Math.abs(ctrB - ctrA);
  const minCTR = Math.min(ctrA, ctrB);
  const significance = minCTR > 0 ? (diff / minCTR) * 100 : 0;

  // 승자 판정
  if (ctrB > ctrA * 1.1) {
    // B가 A보다 10% 이상 높으면 B 승
    return {
      winner: "B",
      confidence: Math.min(significance * 10, 100), // 간단한 신뢰도 계산
      recommendation: significance >= EXPERIMENT_CRITERIA.minSignificance ? "declare_winner" : "continue",
    };
  } else if (ctrA > ctrB * 1.1) {
    // A가 B보다 10% 이상 높으면 A 승
    return {
      winner: "A",
      confidence: Math.min(significance * 10, 100),
      recommendation: significance >= EXPERIMENT_CRITERIA.minSignificance ? "declare_winner" : "continue",
    };
  }

  // 유의차 없음
  return {
    confidence: 0,
    recommendation: "continue",
  };
}

/**
 * 시즌별 분리 집계
 */
export function aggregateByMode(
  logs: Array<{
    variant: Variant;
    mode: "default" | "season";
    event: "exp_impression" | "exp_click";
  }>
): {
  default: { A: ExperimentMetrics; B: ExperimentMetrics };
  season: { A: ExperimentMetrics; B: ExperimentMetrics };
} {
  const defaultLogs = logs.filter((l) => l.mode === "default");
  const seasonLogs = logs.filter((l) => l.mode === "season");

  const aggregate = (logs: typeof defaultLogs) => {
    const A = {
      variant: "A" as Variant,
      impression: logs.filter((l) => l.variant === "A" && l.event === "exp_impression").length,
      click: logs.filter((l) => l.variant === "A" && l.event === "exp_click").length,
      ctr: 0,
    };
    A.ctr = calculateCTR(A.impression, A.click);

    const B = {
      variant: "B" as Variant,
      impression: logs.filter((l) => l.variant === "B" && l.event === "exp_impression").length,
      click: logs.filter((l) => l.variant === "B" && l.event === "exp_click").length,
      ctr: 0,
    };
    B.ctr = calculateCTR(B.impression, B.click);

    return { A, B };
  };

  return {
    default: aggregate(defaultLogs),
    season: aggregate(seasonLogs),
  };
}

/**
 * 출처별 분리 집계
 */
export function aggregateBySource(
  logs: Array<{
    variant: Variant;
    source?: string;
    event: "exp_impression" | "exp_click";
  }>
): Record<string, { A: ExperimentMetrics; B: ExperimentMetrics }> {
  const sources = new Set(logs.map((l) => l.source).filter(Boolean));
  const result: Record<string, { A: ExperimentMetrics; B: ExperimentMetrics }> = {};

  for (const source of sources) {
    const sourceLogs = logs.filter((l) => l.source === source);
    const A = {
      variant: "A" as Variant,
      impression: sourceLogs.filter((l) => l.variant === "A" && l.event === "exp_impression").length,
      click: sourceLogs.filter((l) => l.variant === "A" && l.event === "exp_click").length,
      ctr: 0,
    };
    A.ctr = calculateCTR(A.impression, A.click);

    const B = {
      variant: "B" as Variant,
      impression: sourceLogs.filter((l) => l.variant === "B" && l.event === "exp_impression").length,
      click: sourceLogs.filter((l) => l.variant === "B" && l.event === "exp_click").length,
      ctr: 0,
    };
    B.ctr = calculateCTR(B.impression, B.click);

    result[source!] = { A, B };
  }

  return result;
}
