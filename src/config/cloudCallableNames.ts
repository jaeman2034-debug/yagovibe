/**
 * Cloud Functions(httpsCallable) 이름 — `firebase deploy` 된 함수와 1:1로 맞출 것.
 * 스케줄 전용 함수는 httpsCallable로 호출할 수 없음.
 */

/** 기본 `functions` 코드베이스에 나가는 Callable ID */
export const CLOUD_CALLABLE_DEFAULT = {
  /** 원장 전체 스캔 후 cashBookSummary 정합 — 팀 스태프 */
  reconcileCashBookForTeam: "reconcileCashBookForTeam",
  backfillTeamFeeCashBookEntries: "backfillTeamFeeCashBookEntries",
  repairTeamMembershipCashBookFeeIds: "repairTeamMembershipCashBookFeeIds",
  /** 메인 `functions` 번들 — 배포 시 같은 핸들러에 `repairTeamFeePaymentAmounts` 별칭이 있을 수 있음 */
  repairTeamFeePayments: "repairTeamFeePayments",
  repairTeamFeePaymentAmounts: "repairTeamFeePaymentAmounts",
  /** 팀 멤버 SoT 복구 — 메인 번들(`firebase deploy --only functions` 기본 코드베이스) */
  repairTeamMembersSoTFromIndex: "repairTeamMembersSoTFromIndex",
  /** 경기별 플레이 피드백 → playerStats (클라이언트 대신 서버 트랜잭션) — `VITE_PLAY_FEEDBACK_USE_CALLABLE=1` 시 사용 */
  submitPlayMatchFeedback: "submitPlayMatchFeedback",
} as const;

/**
 * @deprecated 별도 repair 코드베이스 제거됨. `CLOUD_CALLABLE_DEFAULT.repairTeamMembersSoTFromIndex`와 동일.
 */
export const CLOUD_CALLABLE_REPAIR = {
  repairTeamMembersSoTFromIndex: "repairTeamMembersSoTFromIndex",
} as const;

/** 스케줄러만 존재 — 클라이언트에서 httpsCallable 금지 */
export const CLOUD_SCHEDULED_ONLY = {
  reconcileCashBookSummary: "reconcileCashBookSummary",
} as const;
