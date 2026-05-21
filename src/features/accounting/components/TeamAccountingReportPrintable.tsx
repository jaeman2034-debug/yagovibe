import type { TeamCashCategory } from "@/types/teamAccounting";
import { teamCashCategoryLabel } from "@/types/teamAccounting";

type ContributionRow = {
  uid: string;
  name: string;
  total: number;
  membership: number;
  donation: number;
};

type TrendRow = {
  category: string;
  currentAmount: number;
  prevAmount: number;
  diff: number;
  rate: number | null;
};

type Props = {
  teamName: string;
  monthLabel: string;
  generatedAtLabel: string;
  totalIncome: string;
  totalExpense: string;
  net: string;
  avgExpensePerMember: string;
  topIncomeText: string;
  topExpenseText: string;
  compareText: string;
  contributionRows: ContributionRow[];
  increaseRows: TrendRow[];
  decreaseRows: TrendRow[];
};

export default function TeamAccountingReportPrintable({
  teamName,
  monthLabel,
  generatedAtLabel,
  totalIncome,
  totalExpense,
  net,
  avgExpensePerMember,
  topIncomeText,
  topExpenseText,
  compareText,
  contributionRows,
  increaseRows,
  decreaseRows,
}: Props) {
  return (
    <div className="w-[794px] bg-white p-8 text-slate-900">
      <h1 className="text-2xl font-bold">{teamName} 회계 리포트</h1>
      <p className="mt-1 text-sm text-slate-500">
        기준월: {monthLabel} · 생성: {generatedAtLabel}
      </p>

      <section className="mt-6 rounded-xl border border-slate-200 p-4">
        <h2 className="text-base font-semibold">요약</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <p>수입: {totalIncome}</p>
          <p>지출: {totalExpense}</p>
          <p>순증감: {net}</p>
          <p>1인 평균 비용: {avgExpensePerMember}</p>
        </div>
        <div className="mt-2 text-sm">
          <p>주요 수입: {topIncomeText}</p>
          <p>주요 지출: {topExpenseText}</p>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 p-4">
        <h2 className="text-base font-semibold">전월 비교</h2>
        <p className="mt-2 text-sm">{compareText}</p>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 p-4">
        <h2 className="text-base font-semibold">기여도 TOP 5</h2>
        {contributionRows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">데이터 없음</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {contributionRows.slice(0, 5).map((r, idx) => (
              <li key={r.uid}>
                {idx + 1}. {r.name} — {Math.round(r.total).toLocaleString("ko-KR")}원 (회비{" "}
                {Math.round(r.membership).toLocaleString("ko-KR")} + 찬조{" "}
                {Math.round(r.donation).toLocaleString("ko-KR")})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 p-4">
        <h2 className="text-base font-semibold">카테고리 추세 (지출)</h2>
        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-rose-700">증가 TOP 3</p>
            {increaseRows.length === 0 ? (
              <p className="mt-1 text-slate-500">없음</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {increaseRows.map((r) => (
                  <li key={`i-${r.category}`}>
                    {teamCashCategoryLabel("expense", r.category as TeamCashCategory)}:{" "}
                    {Math.round(r.prevAmount).toLocaleString("ko-KR")} →{" "}
                    {Math.round(r.currentAmount).toLocaleString("ko-KR")} (+
                    {Math.round(r.diff).toLocaleString("ko-KR")}원)
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-semibold text-emerald-700">감소 TOP 3</p>
            {decreaseRows.length === 0 ? (
              <p className="mt-1 text-slate-500">없음</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {decreaseRows.map((r) => (
                  <li key={`d-${r.category}`}>
                    {teamCashCategoryLabel("expense", r.category as TeamCashCategory)}:{" "}
                    {Math.round(r.prevAmount).toLocaleString("ko-KR")} →{" "}
                    {Math.round(r.currentAmount).toLocaleString("ko-KR")} (
                    {Math.round(r.diff).toLocaleString("ko-KR")}원)
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

