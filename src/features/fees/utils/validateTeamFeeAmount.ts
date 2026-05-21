/** 회비 생성(클라이언트) — 운영 실수 방지 (원 단위 정수) */
const MIN_WON = 1000;
const LOW_AMOUNT_CONFIRM_BELOW = 10_000;

export type TeamFeeAmountValidationResult =
  | { ok: false; message: string }
  | { ok: true; amount: number; needsLowAmountConfirm: boolean; warnThousandUnit: boolean };

/**
 * - 1,000원 미만: 실패
 * - 1만원 미만: `needsLowAmountConfirm` → 확인 창 권장
 * - 1,000원 단위 아님: `warnThousandUnit` (토스트 경고만, 제출은 허용)
 */
export function validateTeamFeeAmountInput(raw: string | number): TeamFeeAmountValidationResult {
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[, ]/g, ""));
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, message: "금액을 올바르게 입력해 주세요." };
  }
  const amount = Math.floor(n);
  if (n !== amount) {
    return { ok: false, message: "회비 금액은 원 단위로 입력해 주세요." };
  }
  if (amount < MIN_WON) {
    return { ok: false, message: `회비 금액을 확인해 주세요. (최소 ${MIN_WON.toLocaleString("ko-KR")}원 이상)` };
  }
  return {
    ok: true,
    amount,
    needsLowAmountConfirm: amount < LOW_AMOUNT_CONFIRM_BELOW,
    warnThousandUnit: amount % 1000 !== 0,
  };
}

export const TEAM_FEE_MIN_AMOUNT_WON = MIN_WON;
export const TEAM_FEE_LOW_AMOUNT_CONFIRM_BELOW_WON = LOW_AMOUNT_CONFIRM_BELOW;
