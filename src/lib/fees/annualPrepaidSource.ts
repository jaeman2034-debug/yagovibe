/** `teams/.../payments` — 연납 bulk 1회차 vs 회차별 분해 */
export type AnnualPrepaidPaymentSourceType = "annual_prepaid" | "annual_prepaid_split";

export function isAnnualPrepaidPaymentSource(s: string | undefined): boolean {
  return s === "annual_prepaid" || s === "annual_prepaid_split";
}
