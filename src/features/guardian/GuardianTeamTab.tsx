import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useTeamFees } from "@/features/fees/hooks/useTeamFees";
import { useFeePayments } from "@/features/fees/hooks/useFeePayments";
import { useTeamMembers } from "@/features/team/hooks/useTeamMembers";
import { useAcademyAttendanceData } from "@/features/academy/attendance/useAcademyAttendanceData";
import {
  buildGuardianChildFeeRows,
  filterPaymentsForLinkedChildren,
} from "@/lib/guardian/guardianChildFeeProjection";
import { canViewGuardianTeamTab, isGuardianMemberRole } from "@/lib/guardian/guardianReadSelectors";
import { normalizeMemberRole } from "@/lib/team/academyMemberRole";
import { resolveEffectiveSelectedFeeId } from "@/features/fees/utils/feeMonthUi";

type Props = {
  teamId: string;
  viewerRole?: string;
};

function statusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "완납";
    case "overdue":
      return "연체";
    case "pending":
      return "진행중";
    case "failed":
      return "실패";
    default:
      return "미납";
  }
}

function statusClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case "overdue":
    case "failed":
      return "bg-red-100 text-red-800 ring-red-200";
    case "pending":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    default:
      return "bg-amber-50 text-amber-950 ring-amber-200";
  }
}

export default function GuardianTeamTab({ teamId, viewerRole }: Props) {
  const { user } = useAuth();
  const role = normalizeMemberRole(viewerRole);
  const { fees, loading: feesLoading } = useTeamFees(teamId);
  const { members, loading: membersLoading } = useTeamMembers(teamId);
  const { links, loading: linksLoading } = useAcademyAttendanceData(teamId);

  const effectiveFeeId = useMemo(
    () => resolveEffectiveSelectedFeeId(fees, undefined),
    [fees]
  );
  const [feePick, setFeePick] = useState<string | undefined>(undefined);
  const activeFeeId = feePick ?? effectiveFeeId;

  const { payments, loading: paymentsLoading } = useFeePayments(teamId, activeFeeId);

  const scopedPayments = useMemo(() => {
    if (!user?.uid) return [];
    return filterPaymentsForLinkedChildren(payments, user.uid, links, members);
  }, [payments, user?.uid, links, members]);

  const guardianRows = useMemo(() => {
    if (!user?.uid || !activeFeeId) return [];
    const fee = fees.find((f) => f.id === activeFeeId);
    if (!fee) return [];
    return buildGuardianChildFeeRows({
      parentUid: user.uid,
      links,
      members,
      payments: scopedPayments,
      fee,
    });
  }, [user?.uid, links, members, scopedPayments, fees, activeFeeId]);

  const loading = feesLoading || membersLoading || linksLoading || paymentsLoading;

  if (!isGuardianMemberRole(role)) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        보호자 역할이 아닙니다. 팀 홈의 다른 탭을 이용해 주세요.
      </p>
    );
  }

  if (!user?.uid) {
    return <p className="text-sm text-slate-600">로그인이 필요합니다.</p>;
  }

  if (!linksLoading && !canViewGuardianTeamTab(role, links, user.uid)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
        <p className="font-semibold">연결된 자녀가 없습니다</p>
        <p className="mt-2 text-xs leading-relaxed">
          아카데미 명단에서 보호자 초대를 수락하면 이곳에 자녀 회비·출석 요약이 표시됩니다. 팀 운영진에게
          문의하거나 명단 탭에서 초대를 확인해 주세요.
        </p>
        <Link
          to={`/team/${encodeURIComponent(teamId)}?tab=roster`}
          className="mt-3 inline-block text-xs font-semibold text-indigo-700 underline"
        >
          아카데미 명단으로
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="guardian-team-tab">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">보호자 보기</h2>
        <p className="mt-1 text-xs text-slate-500">
          연결된 자녀의 회비만 표시합니다. 결제·수동 완납·데이터 복구는 운영진 전용입니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          to={`/team/${encodeURIComponent(teamId)}?tab=attendance`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50"
        >
          출석 보기
        </Link>
        <Link
          to={`/team/${encodeURIComponent(teamId)}?tab=schedule`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50"
        >
          일정 보기
        </Link>
        <Link
          to={`/team/${encodeURIComponent(teamId)}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-800 hover:bg-slate-50"
        >
          팀 공지·홈
        </Link>
      </div>

      {fees.length > 1 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-600">회차</p>
          <select
            value={activeFeeId ?? ""}
            onChange={(e) => setFeePick(e.target.value || undefined)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {fees.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title} · {f.amount.toLocaleString("ko-KR")}원
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          자녀 회비 불러오는 중…
        </div>
      ) : !activeFeeId || guardianRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
          표시할 회비 회차 또는 연결된 자녀가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {guardianRows.map((row) => (
            <li
              key={`${row.playerUid}-${row.feeId}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{row.displayName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{row.feeTitle}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${statusClass(row.paymentStatus)}`}
                >
                  {statusLabel(row.paymentStatus)}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <dt className="text-slate-400">청구</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {row.amountDueWon.toLocaleString("ko-KR")}원
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">마감</dt>
                  <dd>{row.dueDateLabel ?? "—"}</dd>
                </div>
                {row.paidAtLabel ? (
                  <div className="col-span-2">
                    <dt className="text-slate-400">납부 시각</dt>
                    <dd>{row.paidAtLabel}</dd>
                  </div>
                ) : null}
                {row.sourceLabel ? (
                  <div>
                    <dt className="text-slate-400">경로</dt>
                    <dd>{row.sourceLabel}</dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-slate-400">
        다른 팀원의 납부 내역은 표시되지 않습니다. 문의는 팀 운영진에게 연락해 주세요.
      </p>
    </div>
  );
}
