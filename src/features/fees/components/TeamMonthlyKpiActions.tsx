import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import TeamPaywallModal from "@/features/billing/components/TeamPaywallModal";
import { useTeamBillingDoc } from "@/features/billing/hooks/useTeamBillingDoc";
import { canUseBulkFeeReminders } from "@/lib/billing/hubTeamPlanGates";
import { useFeePayments } from "../hooks/useFeePayments";
import { useTeamFees } from "../hooks/useTeamFees";
import { useTeamMembers } from "@/features/team/hooks/useTeamMembers";
import type { TeamMonthlyStatsDoc } from "../types/teamMonthlyStats";
import { buildFeeMemberRows } from "../utils/feeDashboard";
import { sendBillingReRegisterRequestNotifications } from "../utils/billingReRegisterRequestNotifications";
import { sendBulkFeeReminderNotifications } from "../utils/bulkFeeReminderNotifications";

type Props = {
  teamId: string;
  stats: TeamMonthlyStatsDoc;
};

export default function TeamMonthlyKpiActions({ teamId, stats }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { billing: teamBilling, loading: billingLoading } = useTeamBillingDoc(teamId);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { fees, loading: feesLoading } = useTeamFees(teamId);
  const { members, loading: membersLoading } = useTeamMembers(teamId);

  const targetFee = useMemo(() => fees.find((f) => f.status === "open") ?? fees[0] ?? null, [fees]);
  const { payments, loading: paymentsLoading } = useFeePayments(teamId, targetFee?.id);

  const rows = useMemo(() => {
    if (!targetFee) return [];
    return buildFeeMemberRows(members, payments, targetFee.amount, targetFee.dueDate, targetFee.id);
  }, [targetFee, members, payments]);

  const [busy, setBusy] = useState<string | null>(null);
  const canCheckoutAsOwner = Boolean(
    user?.uid && teamBilling?.ownerUid && user.uid === teamBilling.ownerUid
  );

  const showOverdueReminder = stats.overdueRate >= 15 || stats.unpaidCount > 0;
  const showReRegister = stats.autopayFailCount >= 3;
  const showNoticeHint = stats.paymentRate < 70;

  const dataLoading = feesLoading || membersLoading || paymentsLoading;

  const handleBulkReminders = async () => {
    if (!targetFee) {
      toast.error("회비가 없어 알림을 보낼 수 없습니다.");
      return;
    }
    if (!billingLoading && teamBilling && !canUseBulkFeeReminders(teamBilling.plan, teamBilling.billingStatus)) {
      setPaywallOpen(true);
      return;
    }
    setBusy("bulk");
    try {
      const n = await sendBulkFeeReminderNotifications(teamId, targetFee.id, rows);
      if (n === 0) {
        toast.message("발송할 미납·연체 멤버가 없습니다.");
      } else {
        toast.success(`미납 관련 알림 ${n}건을 큐에 넣었습니다.`);
      }
    } catch (e) {
      console.error(e);
      toast.error("알림 발송에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const handleReRegisterRequests = async () => {
    setBusy("rebill");
    try {
      const n = await sendBillingReRegisterRequestNotifications(teamId);
      if (n === 0) {
        toast.message("자동결제 실패 멤버가 없거나 이미 정리되었습니다.");
      } else {
        toast.success(`카드 재등록 안내 알림 ${n}건을 보냈습니다.`);
      }
    } catch (e) {
      console.error(e);
      toast.error("재등록 안내 발송에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const handleGoAnnounce = () => {
    navigate(`/team/${encodeURIComponent(teamId)}?tab=home#team-home-activity-feed`);
    toast.message("팀 홈 타임라인에서 멤버에게 안내를 남길 수 있습니다.");
  };

  if (!showOverdueReminder && !showReRegister && !showNoticeHint) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <TeamPaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        teamId={teamId}
        feature="bulk_reminder"
        canStartCheckout={canCheckoutAsOwner}
      />
      <h4 className="text-sm font-semibold text-gray-900">바로 실행</h4>
      <p className="mt-0.5 text-xs text-gray-500">KPI 기준으로 표시됩니다. 인사이트와 함께 활용하세요.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {showOverdueReminder && (
          <button
            type="button"
            disabled={dataLoading || busy !== null}
            onClick={() => void handleBulkReminders()}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {busy === "bulk" ? "발송 중…" : "미납자 전체 알림 보내기"}
          </button>
        )}
        {showReRegister && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void handleReRegisterRequests()}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "rebill" ? "발송 중…" : "자동결제 실패자 재등록 요청"}
          </button>
        )}
        {showNoticeHint && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleGoAnnounce}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-950 hover:bg-indigo-100 disabled:opacity-50"
          >
            팀 홈에서 안내하기
          </button>
        )}
      </div>
    </div>
  );
}
