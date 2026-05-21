/**
 * ✅ COMPLETE AUTOMATION DECLARATION
 * 완전 자동화 선언 — 운영 모드: Semi-Auto → Full-Auto
 */

export type AutoModeStatus = "semi-auto" | "full-auto" | "emergency-off";

/**
 * ✅ GLOBAL AUTO MODE 상태
 * - full-auto: 완전 자동화 (감지→완화→복구 자동)
 * - semi-auto: 반자동 (완화 자동, 승인 필요)
 * - emergency-off: 긴급 중단
 */
export interface AutoModeConfig {
  status: AutoModeStatus;
  enabled: boolean;
  auditLevel: "full" | "standard" | "minimal";
  emergencyKillEnabled: boolean;
  lastUpdated: number;
  updatedBy: string;
}

/**
 * ✅ 자동화 가드레일 (불가침)
 */
export const AUTO_GUARDRAILS = {
  /**
   * ❌ 영구 설정 변경 자동화 금지
   */
  NO_PERMANENT_CHANGES: true,

  /**
   * ❌ 승인/정책 확정 자동화 금지
   */
  NO_AUTO_APPROVAL: true,

  /**
   * ✅ 모든 자동 조치 설명 생성 + 링크
   */
  REQUIRE_EXPLANATION: true,

  /**
   * ✅ 실패 시 즉시 롤백
   */
  AUTO_ROLLBACK_ON_FAILURE: true,
} as const;

/**
 * ✅ 기본 자동화 설정
 */
export const DEFAULT_AUTO_MODE: AutoModeConfig = {
  status: "full-auto",
  enabled: true,
  auditLevel: "full",
  emergencyKillEnabled: true,
  lastUpdated: Date.now(),
  updatedBy: "system",
};

/**
 * ✅ 자동화 상태 확인
 */
export function isAutoModeEnabled(config: AutoModeConfig | null): boolean {
  if (!config) return false;
  return config.enabled && config.status === "full-auto" && !config.emergencyKillEnabled;
}

/**
 * ✅ 자동화 선언 완료
 * 시스템은 자율적으로 운영되며, 인간은 방향과 가치만 결정한다.
 */
export const AUTOMATION_DECLARATION = {
  status: "FULL-AUTO ACTIVE",
  mode: "semi-auto → full-auto",
  principles: {
    detection: "Anomaly/Drift/Chaos → 실시간",
    remediation: "Rate-limit / Read-only / Plugin-pause → 자동",
    recovery: "TTL 만료·정상화 신호 → 자동 해제",
    learning: "Before/After KPI → 정책 추천 업데이트",
    validation: "Resilience/MTTR/SLA → 지표 반영",
  },
  guardrails: AUTO_GUARDRAILS,
  declaration: "시스템은 자율적으로 운영되며, 인간은 방향과 가치만 결정한다.",
} as const;

