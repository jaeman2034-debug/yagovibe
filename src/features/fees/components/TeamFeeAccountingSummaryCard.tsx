import { useCurrentMonthFeeAccountingSummary } from "../hooks/useCurrentMonthFeeAccountingSummary";

type Props = {
  teamId: string;
};

function won(n: number): string {
  return `${Math.max(0, Math.floor(n)).toLocaleString("ko-KR")}원`;
}

/** 팀 관리 > fees — 이번 달 회비 운영 요약 (payments 기준) */
export default function TeamFeeAccountingSummaryCard({ teamId }: Props) {
  const s = useCurrentMonthFeeAccountingSummary(teamId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">이번 달 회계 요약</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            마감일이 이번 달(Asia/Seoul)인 회차 기준 · 납부는{" "}
            <code className="rounded bg-slate-100 px-1">payments</code>와 대시보드와 동일 규칙으로 집계합니다.
          </p>
        </div>
      </div>

      {s.loading ? (
        <p className="mt-3 text-sm text-slate-500">불러오는 중...</p>
      ) : s.error ? (
        <p className="mt-3 text-sm text-rose-600">{s.error}</p>
      ) : s.feesDueThisMonthCount === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          이번 달 마감일이 있는 회비가 없습니다. (회비 생성 후 표시됩니다)
        </p>
      ) : s.openFeesDueThisMonthCount === 0 ? (
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>이번 달 마감일 회차는 모두 마감되었거나, 오픈 상태인 회차가 없습니다.</p>
          <p className="text-xs text-slate-500">
            마감률(이번 달 회차):{" "}
            {s.closeRatePercent != null ? (
              <span className="font-semibold text-slate-800">{s.closeRatePercent}%</span>
            ) : (
              "—"
            )}
          </p>
        </div>
      ) : (
        <>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5">
              <dt className="text-xs font-medium text-slate-500">총 회비(예정)</dt>
              <dd className="mt-0.5 text-lg font-semibold text-slate-900 tabular-nums">
                {won(s.totalExpectedWon)}
              </dd>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5">
              <dt className="text-xs font-medium text-emerald-800">납부 완료</dt>
              <dd className="mt-0.5 text-lg font-semibold text-emerald-950 tabular-nums">
                {won(s.collectedWon)}
              </dd>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2.5">
              <dt className="text-xs font-medium text-rose-800">미납 금액</dt>
              <dd className="mt-0.5 text-lg font-semibold text-rose-950 tabular-nums">{won(s.unpaidWon)}</dd>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5">
              <dt className="text-xs font-medium text-amber-900">미납·연체 인원</dt>
              <dd className="mt-0.5 text-lg font-semibold text-amber-950 tabular-nums">
                {s.unpaidMemberCount}명
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span>
              연납률:{" "}
              <strong className="text-slate-900">{s.yearlyMemberRate}%</strong>
              <span className="text-slate-400"> (멤버 기준)</span>
            </span>
            <span>
              미납률:{" "}
              <strong className="text-slate-900">{s.unpaidMemberRate}%</strong>
              <span className="text-slate-400"> (활성 {s.rosterMemberCount}명 중)</span>
            </span>
            <span>
              마감률(이번 달 회차):{" "}
              <strong className="text-slate-900">
                {s.closeRatePercent != null ? `${s.closeRatePercent}%` : "—"}
              </strong>
              <span className="text-slate-400">
                {" "}
                (오픈 {s.openFeesDueThisMonthCount} / 전체 {s.feesDueThisMonthCount})
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
