import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  memberDueUrgencyLine,
  memberIsDuePast,
  memberPayPrimaryButtonLabel,
  memberPaymentStatusUi,
  memberStatusEmoji,
} from "@/lib/team/memberFeeUxCopy";
import type { TeamFee, TeamFeePayment } from "@/types/fee";

export type TeamMemberSummaryCardProps = {
  fees: TeamFee[];
  myPayments: Record<string, TeamFeePayment | null>;
  feesLoading: boolean;
  onStartPay: (fee: TeamFee) => void;
  payingFeeId: string | null;
  confirmingFeePayment: boolean;
  onScrollToMyFees: () => void;
  onScrollToTeamFeed: () => void;
  onOpenMembersTab: () => void;
};

function pickHeroFee(fees: TeamFee[], myPayments: Record<string, TeamFeePayment | null>): TeamFee | null {
  const open = fees.filter((f) => f.status === "open");
  for (const f of open) {
    const p = myPayments[f.id];
    if (!p || p.status !== "paid") return f;
  }
  return open[0] ?? fees[0] ?? null;
}

/**
 * 팀 홈 상단 — 일반 팀원: 내 회비만(팀 전체 납부율·미납 인원·플랜 노출 없음).
 */
export default function TeamMemberSummaryCard({
  fees,
  myPayments,
  feesLoading,
  onStartPay,
  payingFeeId,
  confirmingFeePayment,
  onScrollToMyFees,
  onScrollToTeamFeed,
  onOpenMembersTab,
}: TeamMemberSummaryCardProps) {
  const heroFee = useMemo(() => pickHeroFee(fees, myPayments), [fees, myPayments]);
  const heroPayment = heroFee ? myPayments[heroFee.id] : undefined;
  const status = memberPaymentStatusUi(heroPayment);

  const dueDate =
    heroFee?.dueDate && typeof heroFee.dueDate.toDate === "function" ? heroFee.dueDate.toDate() : null;
  const dueCalendarLabel = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toLocaleDateString("ko-KR") : null;

  const urgencyLine =
    heroPayment?.status !== "paid" && dueDate ? memberDueUrgencyLine(dueDate) : null;
  const duePast = Boolean(dueDate && memberIsDuePast(dueDate));

  const payDisabled =
    !heroFee ||
    heroFee.status === "closed" ||
    payingFeeId === heroFee.id ||
    !status.canPay ||
    confirmingFeePayment;

  const amountLabel = heroFee ? `${heroFee.amount.toLocaleString("ko-KR")}원` : "";

  const isPaid = heroPayment?.status === "paid";
  const isPending = heroPayment?.status === "pending";

  return (
    <div className="mt-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-gray-500">내 회비</p>
          {!feesLoading && fees.length > 1 && (
            <p className="text-xs font-semibold text-violet-800">회비 {fees.length}건</p>
          )}
        </div>
        {!feesLoading && fees.length > 1 && (
          <p className="mt-0.5 text-[11px] leading-snug text-violet-700/90">
            지금 낼 차례만 먼저 보여드려요 · 전체는 아래 &quot;회비 전체 목록&quot;에서 확인할 수 있어요
          </p>
        )}
        {feesLoading && <p className="mt-2 text-sm text-gray-500">불러오는 중…</p>}
        {!feesLoading && !heroFee && (
          <p className="mt-2 text-sm text-gray-600">등록된 회비가 없어요. 총무가 올리면 여기에 표시돼요.</p>
        )}
        {!feesLoading && heroFee && (
          <div className="mt-2 space-y-2">
            <p className="text-base font-semibold text-gray-900">{heroFee.title}</p>
            <p className="text-lg font-bold text-gray-900">{amountLabel}</p>
            {dueCalendarLabel && (
              <p className="text-xs text-gray-500">마감일 {dueCalendarLabel}</p>
            )}
            {urgencyLine && (
              <p
                className={
                  duePast
                    ? "text-sm font-bold text-red-700"
                    : urgencyLine === "오늘 마감"
                      ? "text-sm font-bold text-amber-900"
                      : "text-sm font-bold text-amber-800"
                }
              >
                {urgencyLine}
              </p>
            )}
            <p className={`text-sm ${status.className}`}>
              <span aria-hidden>{memberStatusEmoji(heroPayment)}</span>
              {status.label}
            </p>
            <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:flex-wrap">
              {status.canPay && heroFee.status === "open" && (
                <Button
                  className="h-11 min-h-[2.75rem] px-5 text-[15px] font-semibold sm:text-base"
                  size="default"
                  disabled={payDisabled}
                  onClick={() => onStartPay(heroFee)}
                >
                  {payingFeeId === heroFee.id
                    ? "요청 중…"
                    : confirmingFeePayment
                      ? "승인 처리 중…"
                      : memberPayPrimaryButtonLabel(heroFee.amount, dueDate)}
                </Button>
              )}
              {isPaid && (
                <>
                  {fees.length > 1 && (
                    <Button
                      className="h-11 min-h-[2.75rem] px-5 text-[15px] font-semibold sm:text-base"
                      size="default"
                      variant="secondary"
                      type="button"
                      onClick={onScrollToMyFees}
                    >
                      다른 회비 보기
                    </Button>
                  )}
                  <Button
                    className="h-11 min-h-[2.75rem] px-5 text-[15px] font-semibold sm:text-base"
                    size="default"
                    variant="secondary"
                    type="button"
                    onClick={onScrollToTeamFeed}
                  >
                    팀 소식 보기
                  </Button>
                  <Button
                    className="h-11 min-h-[2.75rem] px-5 text-[15px] font-semibold sm:text-base"
                    size="default"
                    variant="secondary"
                    type="button"
                    onClick={onOpenMembersTab}
                  >
                    멤버 확인
                  </Button>
                </>
              )}
              {isPending && (
                <>
                  {fees.length > 1 && (
                    <Button
                      className="h-11 min-h-[2.75rem] px-5 text-[15px] font-semibold sm:text-base"
                      size="default"
                      variant="secondary"
                      type="button"
                      onClick={onScrollToMyFees}
                    >
                      다른 회비 보기
                    </Button>
                  )}
                  <Button
                    className="h-11 min-h-[2.75rem] px-5 text-[15px] font-semibold sm:text-base"
                    size="default"
                    variant="secondary"
                    type="button"
                    onClick={onScrollToMyFees}
                  >
                    납부 상세 보기
                  </Button>
                </>
              )}
              {status.canPay && heroFee.status === "open" && fees.length > 1 && (
                <Button
                  className="h-11 min-h-[2.75rem] px-5 text-[15px] font-semibold sm:text-base"
                  size="default"
                  variant="secondary"
                  type="button"
                  onClick={onScrollToMyFees}
                >
                  전체 회비 보기
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
