import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TeamMonthlyChartPoint } from "../hooks/useTeamMonthlyStatsSeries";

type Props = {
  points: TeamMonthlyChartPoint[];
  loading?: boolean;
  error?: string | null;
};

function formatWon(n: number): string {
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

export default function TeamMonthlyKpiTrendChart({ points, loading, error }: Props) {
  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (loading) {
    return <p className="text-sm text-gray-500">추이 그래프 불러오는 중…</p>;
  }

  const hasAny = points.some(
    (p) => p.revenue > 0 || p.paymentRate > 0 || p.autopaySuccessRate > 0 || p.overdueRate > 0
  );

  if (!hasAny) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        최근 6개월 집계가 쌓이면 그래프가 표시됩니다.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="mb-1 text-sm font-semibold text-gray-900">최근 6개월 추이</h4>
      <p className="mb-4 text-xs text-gray-500">
        왼쪽 축: 수익(원) · 오른쪽 축: 비율(%) — 서울 기준 월별 스냅샷
      </p>
      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis
              yAxisId="left"
              width={48}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 10000)}만` : `${v}`)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              width={36}
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value: number | string, name: string) => {
                const n = typeof value === "number" ? value : Number(value);
                if (name === "수익") return [formatWon(n), name];
                return [`${n}%`, name];
              }}
              labelFormatter={(label) => {
                const p = points.find((x) => x.monthLabel === label);
                return p ? `${p.month.slice(0, 4)}년 ${Number(p.month.slice(4))}월` : String(label);
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="수익"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="paymentRate"
              name="납부율"
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="autopaySuccessRate"
              name="자동결제 성공률"
              stroke="#d97706"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="overdueRate"
              name="연체율"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
