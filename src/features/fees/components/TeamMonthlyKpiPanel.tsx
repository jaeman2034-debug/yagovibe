import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import TeamPaywallModal from "@/features/billing/components/TeamPaywallModal";
import { useTeamBillingDoc } from "@/features/billing/hooks/useTeamBillingDoc";
import { canUseMonthlyFeeReportPremium } from "@/lib/billing/hubTeamPlanGates";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import { db } from "@/lib/firebase";
import { usePaymentsSnapshotsByFeeIds } from "../hooks/usePaymentsSnapshotsByFeeIds";
import { useTeamFees } from "../hooks/useTeamFees";
import { useTeamMembers } from "@/features/team/hooks/useTeamMembers";
import { useTeamMonthlyStatsSeries } from "../hooks/useTeamMonthlyStatsSeries";
import type { FeePayment, TeamFee } from "../types";
import type { TeamMonthlyStatsDoc } from "../types/teamMonthlyStats";
import {
  rollupFeeCardMetricsForFeesDueInMonth,
  summarizePaidAtVersusDueMonthMismatch,
  summarizePaymentsUnmatchedToActiveRoster,
} from "../utils/feeDashboard";
import { seoulYyyyMm } from "../utils/seoulFeeDue";
import TeamMonthlyKpiActions from "./TeamMonthlyKpiActions";
import TeamMonthlyKpiInsights from "./TeamMonthlyKpiInsights";
import TeamMonthlyKpiTrendChart from "./TeamMonthlyKpiTrendChart";

export type { TeamMonthlyStatsDoc } from "../types/teamMonthlyStats";

type Props = {
  teamId: string;
};

/** KPI가 0으로 보일 때 집계 의미 설명 — 버그가 아닌 데이터 상태 안내 */
function kpiZeroContextNote(data: TeamMonthlyStatsDoc): string | null {
  const fees = data.totalFees ?? 0;
  const paid = data.paidCount ?? 0;
  const rev = data.revenue ?? 0;
  const unpaid = data.unpaidCount ?? 0;

  if (fees <= 0) {
    return "이번 달(서울) 마감 기준으로 집계된 회비 회차가 없습니다. 회비 생성·마감일을 확인해 주세요. 집계는 매일 새벽에 갱신됩니다.";
  }
  if (rev <= 0 && paid <= 0 && unpaid > 0) {
    return "아직 납부 완료(paid) 건이 없어 총 수익·납부율·결제율이 0%로 보입니다. 미납 인원은 아래 숫자 기준 — 표시 오류가 아닙니다.";
  }
  if (rev <= 0 && paid <= 0) {
    return "납부 완료 건이 없습니다. 회비 탭에서 이번 달 회차·payments 상태를 확인해 주세요.";
  }
  return null;
}

function feeDueSeoulYm(fee: Pick<TeamFee, "dueDate">): string | null {
  const d = firestoreLikeToDate(fee.dueDate as unknown);
  if (!d || Number.isNaN(d.getTime())) return null;
  return seoulYyyyMm(d.getTime());
}

function KpiCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function TeamMonthlyKpiPanel({ teamId }: Props) {
  const { user } = useAuth();
  const { billing: teamBilling, loading: billingLoading } = useTeamBillingDoc(teamId);
  const { fees, loading: feesLoading } = useTeamFees(teamId);
  const { members, loading: membersLoading } = useTeamMembers(teamId);
  const [reportPaywallOpen, setReportPaywallOpen] = useState(false);
  const monthKey = seoulYyyyMm();
  const [data, setData] = useState<TeamMonthlyStatsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const { points: trendPoints, loading: trendLoading, error: trendError } = useTeamMonthlyStatsSeries(teamId, 6);
  const canCheckoutAsOwner = Boolean(
    user?.uid && teamBilling?.ownerUid && user.uid === teamBilling.ownerUid
  );

  const feesDueThisMonth = useMemo(
    () => fees.filter((f) => feeDueSeoulYm(f) === monthKey),
    [fees, monthKey]
  );
  const feeIdsDueThisMonth = useMemo(
    () => [...new Set(feesDueThisMonth.map((f) => f.id))],
    [feesDueThisMonth]
  );
  const { paymentsByFeeId, loading: livePaymentsLoading } = usePaymentsSnapshotsByFeeIds(
    teamId,
    feeIdsDueThisMonth
  );

  const liveCardRollup = useMemo(() => {
    if (feeIdsDueThisMonth.length === 0) return null;
    if (membersLoading || feesLoading || livePaymentsLoading) return null;
    return rollupFeeCardMetricsForFeesDueInMonth(feesDueThisMonth, members, paymentsByFeeId);
  }, [
    feeIdsDueThisMonth.length,
    feesDueThisMonth,
    members,
    membersLoading,
    feesLoading,
    livePaymentsLoading,
    paymentsByFeeId,
  ]);

  const paymentDocDiagnostics = useMemo(() => {
    let paymentDocs = 0;
    let paidDocs = 0;
    const allForUnmatch: FeePayment[] = [];
    for (const fid of feeIdsDueThisMonth) {
      const arr = paymentsByFeeId[fid] ?? [];
      paymentDocs += arr.length;
      allForUnmatch.push(...arr);
      for (const p of arr) {
        if (p.status === "paid") paidDocs += 1;
      }
    }
    const rosterUnmatch = summarizePaymentsUnmatchedToActiveRoster(allForUnmatch, members);
    const paidMonthDrift = summarizePaidAtVersusDueMonthMismatch(feesDueThisMonth, paymentsByFeeId);
    return {
      paymentDocs,
      paidDocs,
      feesDueCount: feesDueThisMonth.length,
      activeMembersUi: members.length,
      rosterUnmatch,
      paidMonthDrift,
    };
  }, [feeIdsDueThisMonth, feesDueThisMonth, members, paymentsByFeeId]);

  const diagnosticTagSummary = useMemo(() => {
    const parts: string[] = [];
    if (paymentDocDiagnostics.rosterUnmatch.unmatched > 0) {
      parts.push(`로스터 미매칭 ${paymentDocDiagnostics.rosterUnmatch.unmatched}`);
    }
    if (paymentDocDiagnostics.paidMonthDrift.mismatchCount > 0) {
      parts.push(`마감월≠납부월 ${paymentDocDiagnostics.paidMonthDrift.mismatchCount}`);
    }
    if (paymentDocDiagnostics.paidMonthDrift.paidWithoutPaidAt > 0) {
      parts.push(`paid·paidAt 없음 ${paymentDocDiagnostics.paidMonthDrift.paidWithoutPaidAt}`);
    }
    return parts;
  }, [paymentDocDiagnostics]);

  const mismatchLogKeyRef = useRef<string>("");

  useEffect(() => {
    if (!teamId || !monthKey || !data || !liveCardRollup) {
      mismatchLogKeyRef.current = "";
      return;
    }
    const kpiShowsNoPaid = data.paidCount <= 0 && data.revenue <= 0;
    const cardShowsPaid = liveCardRollup.paidSlots > 0 || liveCardRollup.collectedWon > 0;
    const mismatch = kpiShowsNoPaid && cardShowsPaid;
    if (!mismatch) {
      mismatchLogKeyRef.current = "";
      return;
    }
    const key = `${teamId}:${monthKey}:${data.paidCount}:${data.revenue}:${liveCardRollup.paidSlots}:${liveCardRollup.collectedWon}`;
    if (mismatchLogKeyRef.current === key) return;
    mismatchLogKeyRef.current = key;
    console.warn("[KPI_MISMATCH]", {
      teamId,
      monthKey,
      statsMonthly: {
        paidCount: data.paidCount,
        revenue: data.revenue,
        unpaidCount: data.unpaidCount,
        totalSlots: data.totalSlots,
        totalFees: data.totalFees,
      },
      liveFeeCardRollup: {
        paidSlots: liveCardRollup.paidSlots,
        collectedWon: liveCardRollup.collectedWon,
      },
      snapshot: {
        paymentDocsInMonthFees: paymentDocDiagnostics.paymentDocs,
        paidPaymentDocsInMonthFees: paymentDocDiagnostics.paidDocs,
        rosterUnmatchedPayments: paymentDocDiagnostics.rosterUnmatch,
        paidAtVersusDueMonth: paymentDocDiagnostics.paidMonthDrift,
      },
    });
  }, [
    teamId,
    monthKey,
    data,
    liveCardRollup,
    paymentDocDiagnostics.paymentDocs,
    paymentDocDiagnostics.paidDocs,
    paymentDocDiagnostics.rosterUnmatch.unmatched,
    paymentDocDiagnostics.rosterUnmatch.emptyIdentifier,
    paymentDocDiagnostics.rosterUnmatch.notOnRoster,
    paymentDocDiagnostics.paidMonthDrift.mismatchCount,
    paymentDocDiagnostics.paidMonthDrift.paidWithoutPaidAt,
  ]);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    const ref = doc(db, "teams", teamId, "statsMonthly", monthKey);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setLoading(false);
        if (!snap.exists()) {
          setData(null);
          setMissing(true);
          return;
        }
        setMissing(false);
        const d = snap.data() as Record<string, unknown>;
        setData({
          month: String(d.month || monthKey),
          totalFees: Number(d.totalFees ?? 0),
          totalMembers: Number(d.totalMembers ?? 0),
          paidCount: Number(d.paidCount ?? 0),
          unpaidCount: Number(d.unpaidCount ?? 0),
          overdueCount: Number(d.overdueCount ?? 0),
          totalSlots: typeof d.totalSlots === "number" ? d.totalSlots : undefined,
          autopaySuccessCount: Number(d.autopaySuccessCount ?? 0),
          autopayFailCount: Number(d.autopayFailCount ?? 0),
          revenue: Number(d.revenue ?? 0),
          paymentRate: Number(d.paymentRate ?? 0),
          autopaySuccessRate: Number(d.autopaySuccessRate ?? 0),
          overdueRate: Number(d.overdueRate ?? 0),
        });
      },
      () => {
        setLoading(false);
        setData(null);
        setMissing(true);
      }
    );
    return () => unsub();
  }, [teamId, monthKey]);

  const trendBlock = (
    <TeamMonthlyKpiTrendChart points={trendPoints} loading={trendLoading} error={trendError} />
  );

  const insightsWhenSeriesReady =
    !trendLoading && trendPoints.length > 0 ? (
      <TeamMonthlyKpiInsights points={trendPoints} currentDoc={!loading && !missing && data ? data : null} />
    ) : null;

  const actionsWhenStatsReady =
    !loading && !missing && data ? <TeamMonthlyKpiActions teamId={teamId} stats={data} /> : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">이번 달 KPI 불러오는 중…</p>
        {insightsWhenSeriesReady}
        {actionsWhenStatsReady}
        {trendBlock}
      </div>
    );
  }

  if (missing || !data) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">이번 달 집계 문서가 아직 없습니다.</p>
          <p className="mt-1 text-amber-800/90">
            매일 새벽(서울 03:05) 스케줄러가 갱신합니다. 마감일이 이번 달(서울)인 회비가 있으면 다음 실행 후 표시됩니다.
          </p>
        </div>
        {insightsWhenSeriesReady}
        {actionsWhenStatsReady}
        {trendBlock}
      </div>
    );
  }

  const monthLabel = `${data.month.slice(0, 4)}년 ${data.month.slice(4)}월`;
  const kpiShowsNoPaid = data.paidCount <= 0 && data.revenue <= 0;
  const cardShowsPaid =
    liveCardRollup != null &&
    (liveCardRollup.paidSlots > 0 || liveCardRollup.collectedWon > 0);
  const showKpiVsCardMismatch = kpiShowsNoPaid && cardShowsPaid;
  const zeroKpiHint = showKpiVsCardMismatch ? null : kpiZeroContextNote(data);

  const showReportCta =
    !billingLoading &&
    teamBilling &&
    !canUseMonthlyFeeReportPremium(teamBilling.plan, teamBilling.billingStatus);

  return (
    <div className="space-y-4">
      <TeamPaywallModal
        open={reportPaywallOpen}
        onClose={() => setReportPaywallOpen(false)}
        teamId={teamId}
        feature="monthly_report"
        canStartCheckout={canCheckoutAsOwner}
      />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">회비 KPI</h3>
          <p className="text-sm text-gray-500">
            {monthLabel} · 마감일이 이번 달인 회비 {data.totalFees}건 기준 · 활성 멤버 {data.totalMembers}명
          </p>
        </div>
        {showReportCta ? (
          <button
            type="button"
            onClick={() => setReportPaywallOpen(true)}
            className="min-h-[40px] shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-950 hover:bg-indigo-100"
          >
            월간 리포트·보내기
          </button>
        ) : null}
      </div>

      {showKpiVsCardMismatch && liveCardRollup ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">KPI 집계와 회비 카드 불일치</p>
          <p className="mt-1 leading-snug text-amber-900/95">
            이 패널의 숫자는 <span className="font-medium">statsMonthly</span>(매일 새벽 서울 기준 배치 스냅샷)이고,
            회비 탭 카드는 <span className="font-medium">실시간 payments</span> 기준입니다. 방금 납부 처리했다면 새벽
            배치까지 KPI가 0으로 남을 수 있습니다.
          </p>
          <p className="mt-2 rounded-md bg-white/60 px-2 py-1.5 font-mono text-xs text-amber-950">
            실시간(회비 카드 동일 규칙): 납부 완료 슬롯 {liveCardRollup.paidSlots}건 · 누적 수납 ₩
            {liveCardRollup.collectedWon.toLocaleString("ko-KR")}{" "}
            <span className="font-sans text-amber-900/90">
              ↔ KPI 문서: 납부 {data.paidCount} · ₩{data.revenue.toLocaleString("ko-KR")}
            </span>
          </p>
          <p className="mt-2 text-xs text-amber-900/85">
            새벽 집계 이후에도 계속 어긋나면 <code className="rounded bg-white/70 px-1">payments</code>의
            memberId/userId와 멤버 문서 조인, 또는 마감일이 이번 달(서울)인지 확인해 주세요.
          </p>
        </div>
      ) : null}

      {zeroKpiHint ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-medium">KPI가 0으로 보일 때</p>
          <p className="mt-1 leading-snug text-sky-900/95">{zeroKpiHint}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard title="총 수익" value={`₩${data.revenue.toLocaleString("ko-KR")}`} sub="납부 완료 합산" />
        <KpiCard title="납부율" value={`${data.paymentRate}%`} sub={`납부 ${data.paidCount} / 슬롯 ${data.totalSlots ?? "—"}`} />
        <KpiCard title="자동결제 성공률" value={`${data.autopaySuccessRate}%`} sub={`성공 ${data.autopaySuccessCount} · 실패 ${data.autopayFailCount}`} />
        <KpiCard title="연체율" value={`${data.overdueRate}%`} sub={`연체 ${data.overdueCount}명`} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm text-gray-600">
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          미납(마감 전) <span className="font-semibold text-gray-900">{data.unpaidCount}</span>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          연체 <span className="font-semibold text-gray-900">{data.overdueCount}</span>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          납부 완료 <span className="font-semibold text-gray-900">{data.paidCount}</span>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          집계 슬롯 <span className="font-semibold text-gray-900">{data.totalSlots ?? "—"}</span>
        </div>
      </div>

      {insightsWhenSeriesReady}

      {actionsWhenStatsReady}

      {trendBlock}

      {!membersLoading && !livePaymentsLoading && !feesLoading ? (
        <details className="rounded-lg border border-gray-200 bg-gray-50/80 text-sm text-gray-800">
          <summary className="cursor-pointer select-none px-4 py-3 font-medium text-gray-700 outline-none hover:bg-gray-100/80">
            회비 KPI 진단 (관리자)
          </summary>
          <div className="space-y-2 border-t border-gray-200 px-4 pb-4 pt-2 font-mono text-xs leading-relaxed text-gray-900">
            <p>
              <span className="text-gray-500">서울 월 키</span> {monthKey}
            </p>
            <p>
              <span className="text-gray-500">이번 달 마감 회차 수</span> {paymentDocDiagnostics.feesDueCount}
            </p>
            <p>
              <span className="text-gray-500">활성 멤버(UI 구독)</span> {paymentDocDiagnostics.activeMembersUi}{" "}
              <span className="text-gray-500">· statsMonthly.totalMembers</span> {data.totalMembers}
            </p>
            <p>
              <span className="text-gray-500">payments 문서 수(해당 회차 합)</span>{" "}
              {paymentDocDiagnostics.paymentDocs}{" "}
              <span className="text-gray-500">· 그중 status=paid</span> {paymentDocDiagnostics.paidDocs}
            </p>
            <p>
              <span className="text-gray-500">로스터 미매칭 payments</span>{" "}
              {paymentDocDiagnostics.rosterUnmatch.unmatched}건
              {paymentDocDiagnostics.rosterUnmatch.unmatched > 0 ? (
                <>
                  {" "}
                  <span className="text-gray-500">
                    (식별자 없음 {paymentDocDiagnostics.rosterUnmatch.emptyIdentifier} · 로스터 외 키{" "}
                    {paymentDocDiagnostics.rosterUnmatch.notOnRoster})
                  </span>
                </>
              ) : null}
            </p>
            {paymentDocDiagnostics.rosterUnmatch.unmatched > 0 ? (
              <p className="font-sans text-[11px] leading-snug text-amber-900/95">
                원인 힌트: 식별자 없음은 memberId/userId·문서 ID 파싱 불가 쪽, 로스터 외 키는{" "}
                <code className="rounded bg-white px-1">billingUid</code>·멤버 문서 ID와 payments 필드 불일치 가능.
              </p>
            ) : null}
            <p>
              <span className="text-gray-500">마감 월 ≠ paidAt 월(서울)</span>{" "}
              {paymentDocDiagnostics.paidMonthDrift.mismatchCount}건
              {paymentDocDiagnostics.paidMonthDrift.mismatchCount > 0 ? (
                <span className="text-gray-500"> · 지연 납부·자정 경계 등으로 흔함</span>
              ) : null}
            </p>
            <p>
              <span className="text-gray-500">status=paid 인데 paidAt 없음</span>{" "}
              {paymentDocDiagnostics.paidMonthDrift.paidWithoutPaidAt}건
            </p>
            {paymentDocDiagnostics.paidMonthDrift.mismatchCount > 0 ||
            paymentDocDiagnostics.paidMonthDrift.paidWithoutPaidAt > 0 ? (
              <p className="font-sans text-[11px] leading-snug text-slate-700">
                KPI 배치는 회차 마감일이 속한 달 기준입니다. 결제 완료 시각(paidAt)만 다른 달이면 여기서 건수가
                잡히며, 카드와 배치 숫자가 어긋날 때 원인 후보로 보시면 됩니다.
              </p>
            ) : null}
            <p>
              <span className="text-gray-500">statsMonthly</span> paid {data.paidCount} · revenue ₩
              {data.revenue.toLocaleString("ko-KR")} · slots {data.totalSlots ?? "—"}
            </p>
            <p>
              <span className="text-gray-500">실시간 롤업(카드 규칙)</span>{" "}
              {liveCardRollup
                ? `paidSlots ${liveCardRollup.paidSlots} · collected ₩${liveCardRollup.collectedWon.toLocaleString("ko-KR")}`
                : "—"}
            </p>
            <p className="font-sans text-[11px] leading-snug text-gray-600">
              배치 KPI와 실시간 카드가 어긋나면 위 숫자를 콘솔{" "}
              <code className="rounded bg-white px-1">[KPI_MISMATCH]</code> 로그와 함께 비교하세요.
            </p>
            {diagnosticTagSummary.length > 0 ? (
              <p className="rounded-md border border-indigo-100 bg-indigo-50/90 px-2 py-1.5 font-sans text-[11px] leading-snug text-indigo-950">
                탐지 요약: {diagnosticTagSummary.join(" · ")}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
