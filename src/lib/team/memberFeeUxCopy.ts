import { seoulCalendarFromInstant, seoulDayEndMillisForDueInstant } from "@/features/fees/utils/seoulFeeDue";
import type { TeamFeePayment } from "@/types/fee";

/** 접근성: 상태 앞 장식(스크린리더는 label만 읽히게 상위에서 aria-hidden 권장) */
export function memberStatusEmoji(p: TeamFeePayment | null | undefined): string {
  if (!p) return "❌ ";
  if (p.status === "paid") return "✅ ";
  if (p.status === "pending") return "⏳ ";
  if (p.status === "failed") return "⚠️ ";
  return "❌ ";
}

/** 팀원용 납부 상태 한 줄 (기술 status 문자열 노출 금지) */
export function memberPaymentStatusUi(payment: TeamFeePayment | null | undefined): {
  label: string;
  className: string;
  canPay: boolean;
} {
  if (!payment) {
    return { label: "아직 안 냈어요", className: "font-semibold text-amber-900", canPay: true };
  }
  if (payment.status === "paid") {
    return { label: "납부 완료", className: "font-semibold text-emerald-700", canPay: false };
  }
  if (payment.status === "pending") {
    return { label: "결제 확인 중이에요", className: "font-medium text-gray-700", canPay: false };
  }
  if (payment.status === "failed") {
    return {
      label: "결제 실패 — 다시 시도해 주세요",
      className: "font-semibold text-red-700",
      canPay: true,
    };
  }
  return { label: "아직 안 냈어요", className: "font-semibold text-amber-900", canPay: true };
}

/**
 * 서울 달력 기준 마감일까지 남은 일·초과 여부 (마감일 당일 23:59:59 KST까지는 아직 '남음')
 */
export function memberDueUrgencyLine(due: Date | null | undefined, now: Date = new Date()): string | null {
  if (!due || Number.isNaN(due.getTime())) return null;
  const dueEnd = seoulDayEndMillisForDueInstant(due.getTime());
  const t = now.getTime();
  if (t > dueEnd) {
    return "마감 지났어요 — 지금 바로 납부가 필요해요";
  }
  const d0 = seoulCalendarFromInstant(t);
  const d1 = seoulCalendarFromInstant(due.getTime());
  const t0 = Date.UTC(d0.y, d0.M - 1, d0.d);
  const t1 = Date.UTC(d1.y, d1.M - 1, d1.d);
  const diffDays = Math.round((t1 - t0) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return "마감 지났어요 — 지금 바로 납부가 필요해요";
  if (diffDays === 0) return "오늘 마감";
  if (diffDays === 1) return "내일 마감";
  return `${diffDays}일 남음`;
}

/** 마감일(서울 기준 종료 시각)이 지났는지 */
export function memberIsDuePast(due: Date | null | undefined, now: Date = new Date()): boolean {
  if (!due || Number.isNaN(due.getTime())) return false;
  return now.getTime() > seoulDayEndMillisForDueInstant(due.getTime());
}

/** 납부 CTA 문구 (연체 시 강조) */
export function memberPayPrimaryButtonLabel(amount: number, due: Date | null | undefined): string {
  const amt = `${amount.toLocaleString("ko-KR")}원`;
  if (memberIsDuePast(due)) {
    return `연체 ${amt} 지금 납부하기`;
  }
  return `지금 ${amt} 납부하기`;
}
