/**
 * Sprint 2-4 PREP — Platform notification events (design + mapping only).
 * Live NCP SENS / Kakao send = HOLD until support reply + template approval.
 *
 * SoT doc: docs/operations/YAGO_SPRINT24_NCP_ALIMTALK_PREP_LOCK.md
 */

export const PLATFORM_NOTIFY_EVENT_IDS = [
  "TEAM_CREATED",
  "VENUE_BOOKING_REQUESTED",
  "PAYMENT_CLAIM_REQUESTED",
  "PAYMENT_CONFIRMED",
  "RESERVATION_FINALIZED",
  "AI_REPORT_READY",
] as const;

export type PlatformNotifyEventId = (typeof PLATFORM_NOTIFY_EVENT_IDS)[number];

export type PlatformNotifyAudience =
  | "team_owner"
  | "team_members"
  | "federation_managers"
  | "reservation_applicant"
  | "parent"
  | "custom";

export type PlatformNotifyEventDef = {
  id: PlatformNotifyEventId;
  /** Korean ops label */
  label: string;
  description: string;
  /** Primary audience for routing design */
  defaultAudience: PlatformNotifyAudience;
  /** Aligns with venue 3-axis / product language */
  notes?: string;
};

export const PLATFORM_NOTIFY_EVENTS: Record<
  PlatformNotifyEventId,
  PlatformNotifyEventDef
> = {
  TEAM_CREATED: {
    id: "TEAM_CREATED",
    label: "팀 생성 완료",
    description: "팀 생성·공개 홈 준비 완료 시 오너에게 안내",
    defaultAudience: "team_owner",
  },
  VENUE_BOOKING_REQUESTED: {
    id: "VENUE_BOOKING_REQUESTED",
    label: "구장 예약 신청",
    description: "클럽이 구장 대관을 신청했을 때 (배정 전)",
    defaultAudience: "reservation_applicant",
    notes: "Maps to Kakao RESERVATION_REQUEST",
  },
  PAYMENT_CLAIM_REQUESTED: {
    id: "PAYMENT_CLAIM_REQUESTED",
    label: "입금 확인 요청",
    description: "회원이 입금 신고(claim)했을 때 — 관리자 통장 확인 대기 (≠ CONFIRMED)",
    defaultAudience: "federation_managers",
    notes: "Sprint 2-2 ops stage CLAIMED",
  },
  PAYMENT_CONFIRMED: {
    id: "PAYMENT_CONFIRMED",
    label: "입금 확인 완료",
    description: "협회가 paymentStatus=CONFIRMED 처리",
    defaultAudience: "reservation_applicant",
    notes: "Sprint 2-2 ops stage PAYMENT_CONFIRMED",
  },
  RESERVATION_FINALIZED: {
    id: "RESERVATION_FINALIZED",
    label: "예약 확정",
    description: "confirmStatus=FINALIZED",
    defaultAudience: "reservation_applicant",
    notes: "Sprint 2-2 ops stage FINALIZED",
  },
  AI_REPORT_READY: {
    id: "AI_REPORT_READY",
    label: "AI 리포트 생성 완료",
    description: "성장/분석 리포트가 부모·코치에게 전달 가능할 때",
    defaultAudience: "parent",
    notes: "K3 product lock may still gate productization; event wiring only",
  },
};

export function listPlatformNotifyEvents(): PlatformNotifyEventDef[] {
  return PLATFORM_NOTIFY_EVENT_IDS.map((id) => PLATFORM_NOTIFY_EVENTS[id]);
}

export function isPlatformNotifyEventId(raw: string): raw is PlatformNotifyEventId {
  return (PLATFORM_NOTIFY_EVENT_IDS as readonly string[]).includes(raw);
}
