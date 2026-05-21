/**
 * 운영 기준 — Stripe → UI (팀 합의용 "정답" 타입)
 * KPI/집계: `includeInMRR`·`status` 필드, cancel 예정은 Stripe status 유지
 */

export type UiStatus =
    | "active"
    | "trial"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "incomplete"
    | "failed"
    | "paused";

export interface UiState {
    status: UiStatus;
    label: string;
    isPaid: boolean;
    /** MRR(월 정액) 합산에 넣는지 — 운영: active만(취소 예정 active 포함) */
    includeInMRR: boolean;
}
