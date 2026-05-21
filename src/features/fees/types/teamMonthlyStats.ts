/** teams/{teamId}/statsMonthly/{yyyymm} — 스케줄러 스냅샷 */
export type TeamMonthlyStatsDoc = {
  month: string;
  totalFees: number;
  totalMembers: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
  totalSlots?: number;
  autopaySuccessCount: number;
  autopayFailCount: number;
  revenue: number;
  paymentRate: number;
  autopaySuccessRate: number;
  overdueRate: number;
};
