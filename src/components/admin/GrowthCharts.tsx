/**
 * 🔥 GrowthCharts - 성장 차트 컴포넌트
 * 
 * 역할:
 * - Events per Month (Line Chart)
 * - New Players per Month (Line Chart)
 * - Matches per Week (Bar Chart)
 * 
 * Note: Recharts가 없으면 간단한 시각화로 fallback
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyStats, WeeklyStats } from "@/services/analyticsService";

interface GrowthChartsProps {
  monthlyStats: MonthlyStats[];
  weeklyStats: WeeklyStats[];
  loading?: boolean;
}

export function GrowthCharts({
  monthlyStats,
  weeklyStats,
  loading = false,
}: GrowthChartsProps) {
  // Recharts 사용 가능 여부 확인
  let RechartsAvailable = false;
  let LineChart: any = null;
  let BarChart: any = null;
  let XAxis: any = null;
  let YAxis: any = null;
  let CartesianGrid: any = null;
  let Tooltip: any = null;
  let Legend: any = null;
  let Line: any = null;
  let Bar: any = null;
  let ResponsiveContainer: any = null;

  try {
    const recharts = require("recharts");
    RechartsAvailable = true;
    LineChart = recharts.LineChart;
    BarChart = recharts.BarChart;
    XAxis = recharts.XAxis;
    YAxis = recharts.YAxis;
    CartesianGrid = recharts.CartesianGrid;
    Tooltip = recharts.Tooltip;
    Legend = recharts.Legend;
    Line = recharts.Line;
    Bar = recharts.Bar;
    ResponsiveContainer = recharts.ResponsiveContainer;
  } catch {
    // Recharts가 없으면 fallback 사용
    RechartsAvailable = false;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>로딩 중...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 월 포맷팅 (2026-03 → 2026년 3월)
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-");
    return `${year}년 ${parseInt(monthNum)}월`;
  };

  // 주 포맷팅 (2026-W12 → 12주차)
  const formatWeek = (week: string) => {
    const weekNum = week.split("-W")[1];
    return `${parseInt(weekNum)}주차`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      {/* Events per Month */}
      <Card>
        <CardHeader>
          <CardTitle>월별 이벤트 생성</CardTitle>
        </CardHeader>
        <CardContent>
          {RechartsAvailable && monthlyStats.length > 0 ? (
            <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <ResponsiveContainer width="100%" height={250} minHeight={250}>
                <LineChart data={monthlyStats} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={formatMonth} />
                  <Line
                    type="monotone"
                    dataKey="events"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name="이벤트"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <SimpleLineChart
              data={monthlyStats}
              dataKey="events"
              labelKey="month"
              labelFormatter={formatMonth}
              color="#2563eb"
            />
          )}
        </CardContent>
      </Card>

      {/* New Players per Month */}
      <Card>
        <CardHeader>
          <CardTitle>월별 신규 선수</CardTitle>
        </CardHeader>
        <CardContent>
          {RechartsAvailable && monthlyStats.length > 0 ? (
            <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <ResponsiveContainer width="100%" height={250} minHeight={250}>
                <LineChart data={monthlyStats} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={formatMonth} />
                  <Line
                    type="monotone"
                    dataKey="newPlayers"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="신규 선수"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <SimpleLineChart
              data={monthlyStats}
              dataKey="newPlayers"
              labelKey="month"
              labelFormatter={formatMonth}
              color="#10b981"
            />
          )}
        </CardContent>
      </Card>

      {/* Matches per Week */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>주별 경기 수</CardTitle>
        </CardHeader>
        <CardContent>
          {RechartsAvailable && weeklyStats.length > 0 ? (
            <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <ResponsiveContainer width="100%" height={250} minHeight={250}>
                <BarChart data={weeklyStats} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={formatWeek}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip labelFormatter={formatWeek} />
                  <Bar dataKey="matches" fill="#f59e0b" name="경기 수" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <SimpleBarChart
              data={weeklyStats}
              dataKey="matches"
              labelKey="week"
              labelFormatter={formatWeek}
              color="#f59e0b"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Recharts가 없을 때 사용하는 간단한 Line Chart
 */
function SimpleLineChart({
  data,
  dataKey,
  labelKey,
  labelFormatter,
  color,
}: {
  data: any[];
  dataKey: string;
  labelKey: string;
  labelFormatter: (label: string) => string;
  color: string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        데이터가 없습니다
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d[dataKey] || 0), 1);

  return (
    <div className="space-y-2 sm:space-y-3">
      {data.map((item, index) => {
        const value = item[dataKey] || 0;
        const percentage = (value / maxValue) * 100;

        return (
          <div key={index} className="flex items-center gap-2 sm:gap-3">
            <div className="w-16 sm:w-20 text-xs text-gray-600 flex-shrink-0">
              {labelFormatter(item[labelKey])}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="h-5 sm:h-6 rounded flex-shrink-0"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                    minWidth: value > 0 ? "4px" : "0",
                  }}
                />
                <span className="text-xs sm:text-sm font-medium text-gray-700 w-10 sm:w-12 text-right flex-shrink-0">
                  {value}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Recharts가 없을 때 사용하는 간단한 Bar Chart
 */
function SimpleBarChart({
  data,
  dataKey,
  labelKey,
  labelFormatter,
  color,
}: {
  data: any[];
  dataKey: string;
  labelKey: string;
  labelFormatter: (label: string) => string;
  color: string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        데이터가 없습니다
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d[dataKey] || 0), 1);

  return (
    <div className="space-y-2 sm:space-y-3">
      {data.map((item, index) => {
        const value = item[dataKey] || 0;
        const percentage = (value / maxValue) * 100;

        return (
          <div key={index} className="flex items-center gap-2 sm:gap-3">
            <div className="w-20 sm:w-24 text-xs text-gray-600 flex-shrink-0">
              {labelFormatter(item[labelKey])}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="h-6 sm:h-8 rounded flex-shrink-0"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                    minWidth: value > 0 ? "4px" : "0",
                  }}
                />
                <span className="text-xs sm:text-sm font-medium text-gray-700 w-10 sm:w-12 text-right flex-shrink-0">
                  {value}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
