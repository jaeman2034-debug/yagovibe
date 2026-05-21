import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import TeamPaywallModal from "@/features/billing/components/TeamPaywallModal";
import { useTeamBillingDoc } from "@/features/billing/hooks/useTeamBillingDoc";
import { useFeePayments } from "@/features/fees/hooks/useFeePayments";
import { buildFeeMemberRows, calculateFeeDashboardStats } from "@/features/fees/utils/feeDashboard";
import { sendBulkFeeReminderNotifications } from "@/features/fees/utils/bulkFeeReminderNotifications";
import { canUseBulkFeeReminders } from "@/lib/billing/hubTeamPlanGates";
import type { TeamFee } from "@/types/fee";
import type { TeamMember } from "@/features/fees/types";
import type { HubTeamPlanId } from "@/types/teamBilling";

function hubPlanLabel(plan: HubTeamPlanId): string {
  switch (plan) {
    case "free":
      return "Free";
    case "basic":
      return "Basic";
    case "pro":
      return "Pro";
    case "team_plus":
      return "Team+";
    default:
      return String(plan);
  }
}

export type TeamOwnerSummarySectionProps = {
  teamId: string;
  fees: TeamFee[];
  feesLoading: boolean;
  mc: number;
  feeDashMembers: TeamMember[];
  feeDashMembersLoading: boolean;
  membersManageHref: string;
  /** 모집·채팅·멤버·일정·라인업 등 상단 퀵 그리드 — 접힘 영역 안에 렌더 */
  quickActions?: ReactNode;
  defaultMoreOpen?: boolean;
};

/**
 * 팀장 요약: 플랜·납부 요약·바로 알림은 항상 노출.
 * 미납 경고·회비 안내·퀵 액션·멤버/회비 보조는 「운영 메뉴」 접기 안으로.
 */
export default function TeamOwnerSummarySection({
  teamId,
  fees,
  feesLoading,
  mc,
  feeDashMembers,
  feeDashMembersLoading,
  membersManageHref,
  quickActions,
  defaultMoreOpen = false,
}: TeamOwnerSummarySectionProps) {
  const { user } = useAuth();
  const { billing: teamBilling, loading: teamBillingLoading } = useTeamBillingDoc(teamId);
  const [homeFeePaywallOpen, setHomeFeePaywallOpen] = useState(false);
  const [bulkRemindBusy, setBulkRemindBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(defaultMoreOpen);

  const primaryFee = useMemo(() => {
    const openFirst = fees.find((f) => f.status === "open");
    return openFirst ?? fees[0] ?? null;
  }, [fees]);

  const { payments: primaryFeePayments, loading: primaryFeePaymentsLoading } = useFeePayments(
    teamId,
    primaryFee?.id
  );

  const feeSummaryStats = useMemo(() => {
    if (!primaryFee) return null;
    const rows = buildFeeMemberRows(
      feeDashMembers,
      primaryFeePayments,
      primaryFee.amount,
      primaryFee.dueDate,
      primaryFee.id
    );
    return { rows, stats: calculateFeeDashboardStats(rows, rows.length) };
  }, [primaryFee, feeDashMembers, primaryFeePayments]);

  const actionableFeeCount = useMemo(() => {
    if (!feeSummaryStats) return 0;
    return feeSummaryStats.rows.filter(
      (r) =>
        r.paymentStatus === "unpaid" ||
        r.paymentStatus === "failed" ||
        r.paymentStatus === "overdue"
    ).length;
  }, [feeSummaryStats]);

  const manageFeesHref = `/teams/${encodeURIComponent(teamId)}/manage?tab=fees`;
  const hasAnyFee = fees.length > 0;
  const hasActionableUnpaid = actionableFeeCount > 0;

  const canOwnerCheckout = Boolean(
    user?.uid && teamBilling?.ownerUid && user.uid === teamBilling.ownerUid
  );

  const nextBillingReadable =
    teamBilling?.currentPeriodEnd && teamBilling.plan !== "free"
      ? teamBilling.currentPeriodEnd.toLocaleDateString("ko-KR", {
          month: "long",
          day: "numeric",
          timeZone: "Asia/Seoul",
        })
      : null;

  const feeStatsLineReady =
    Boolean(primaryFee) &&
    !feesLoading &&
    !feeDashMembersLoading &&
    !primaryFeePaymentsLoading &&
    feeSummaryStats;

  const handleHomeBulkRemind = useCallback(async () => {
    if (!primaryFee || !feeSummaryStats) return;
    if (
      !teamBillingLoading &&
      teamBilling &&
      !canUseBulkFeeReminders(teamBilling.plan, teamBilling.billingStatus)
    ) {
      setHomeFeePaywallOpen(true);
      return;
    }
    setBulkRemindBusy(true);
    const loadingToastId = toast.loading("알림을 보내는 중…");
    try {
      const n = await sendBulkFeeReminderNotifications(teamId, primaryFee.id, feeSummaryStats.rows);
      toast.dismiss(loadingToastId);
      if (n === 0) {
        toast.message("발송할 미납·연체 멤버가 없습니다.");
      } else {
        toast.success(`알림 ${n}건을 보냈어요.`);
      }
    } catch {
      toast.dismiss(loadingToastId);
      toast.error("알림 발송에 실패했습니다.");
    } finally {
      setBulkRemindBusy(false);
    }
  }, [teamId, primaryFee, feeSummaryStats, teamBillingLoading, teamBilling]);

  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          <div>
            <p className="text-base font-semibold leading-snug text-gray-900">
              {teamBillingLoading && "플랜 정보를 불러오는 중…"}
              {!teamBillingLoading && teamBilling && (
                <>
                  {hubPlanLabel(teamBilling.plan)} 플랜
                  {nextBillingReadable ? (
                    <> · 다음 결제 {nextBillingReadable}</>
                  ) : teamBilling.plan === "free" ? (
                    <> · 멤버 최대 15명 · 지금 {mc}명</>
                  ) : null}
                </>
              )}
              {!teamBillingLoading && !teamBilling && (
                <span className="font-normal text-gray-500">플랜 정보를 불러오지 못했습니다.</span>
              )}
            </p>
          </div>
          <div className="border-t border-gray-100 pt-3">
            {feeStatsLineReady && feeSummaryStats ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  팀원 {mc}명 / 납부율 {feeSummaryStats.stats.paymentRate}%
                </p>
                <p
                  className={
                    actionableFeeCount > 0
                      ? "text-base font-bold text-amber-900"
                      : "text-base font-bold text-gray-700"
                  }
                >
                  → 미납 {actionableFeeCount}명
                </p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-900">
                팀원 {mc}명
                {primaryFee && !feeStatsLineReady && (
                  <span className="font-normal text-gray-500"> · 회비 집계 불러오는 중…</span>
                )}
                {!primaryFee && !feesLoading && (
                  <span className="font-normal text-gray-500"> · 등록된 회비 없음</span>
                )}
              </p>
            )}
          </div>

          {hasActionableUnpaid && primaryFee && (
            <div className="space-y-1 border-t border-gray-100 pt-3">
              <Button
                className="h-11 min-h-[2.75rem] w-full px-5 text-[15px] font-semibold sm:w-auto sm:text-base"
                size="default"
                disabled={bulkRemindBusy || !feeStatsLineReady}
                onClick={() => void handleHomeBulkRemind()}
              >
                {bulkRemindBusy ? "발송 중…" : "👉 바로 알림 보내기"}
              </Button>
              <p className="text-xs text-gray-600">미납 멤버에게 자동으로 알림이 전송됩니다</p>
            </div>
          )}

          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
          >
            <span>운영 메뉴 · 미납 안내·바로가기</span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-gray-600 transition-transform ${moreOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          <AnimatePresence initial={false}>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-3 border-t border-gray-100 pt-3">
                  {hasActionableUnpaid && primaryFee && feeStatsLineReady && (
                    <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-3 text-amber-950 shadow-md">
                      <p className="text-base font-bold leading-snug">
                        <span className="mr-1" aria-hidden>
                          ⚠️
                        </span>
                        지금 {actionableFeeCount}명이 아직 회비를 안 냈습니다
                      </p>
                    </div>
                  )}

                  {!feesLoading && !hasAnyFee && (
                    <div className="rounded-xl border-2 border-blue-300 bg-blue-50 px-3 py-3 text-blue-950 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold">
                          멤버 {mc}명 · 아직 회비를 안 만들었어요. 회비만 만들면 바로 걷을 수 있어요.
                        </p>
                        <Button className="h-10 shrink-0 px-4 text-sm font-semibold" size="sm" asChild>
                          <Link to={manageFeesHref}>지금 회비 만들기</Link>
                        </Button>
                      </div>
                    </div>
                  )}

                  {quickActions ? <div className="space-y-1">{quickActions}</div> : null}

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {hasAnyFee && !(hasActionableUnpaid && primaryFee) ? (
                      <Button
                        className="h-11 min-h-[2.75rem] px-5 text-[15px] font-semibold sm:text-base"
                        size="default"
                        asChild
                      >
                        <Link to={manageFeesHref}>회비 요청 보내기</Link>
                      </Button>
                    ) : null}

                    <Button
                      variant="outline"
                      className="h-11 min-h-[2.75rem] px-5 text-[15px] font-semibold sm:text-base"
                      size="default"
                      asChild
                    >
                      <Link to={membersManageHref}>멤버 추가하기</Link>
                    </Button>
                  </div>

                  {mc > 15 && teamBilling?.plan === "free" && !teamBillingLoading && (
                    <div className="rounded-xl border-2 border-violet-400 bg-violet-50 px-3 py-3 text-sm text-violet-950 shadow-md">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2">
                          <Zap className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" aria-hidden />
                          <p className="text-base font-bold">Free 플랜은 15명까지입니다</p>
                        </div>
                        <Button
                          className="h-11 min-h-[2.75rem] shrink-0 px-5 text-[15px] font-semibold sm:text-base"
                          size="default"
                          asChild
                        >
                          <Link to={manageFeesHref}>지금 Pro로 업그레이드</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <TeamPaywallModal
        open={homeFeePaywallOpen}
        onClose={() => setHomeFeePaywallOpen(false)}
        teamId={teamId}
        feature="bulk_reminder"
        canStartCheckout={canOwnerCheckout}
      />
    </div>
  );
}
