import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

type Props = {
    data: any[];
    months: string[];
};

export default function TrendChart({ data, months }: Props) {
    // 월별 평균 점수 계산
    const monthAverages = months.map((m) => {
        const monthData = data.filter((d) => d.month === m);
        const avg = monthData.reduce((a: number, b: any) => a + b.score, 0) / (monthData.length || 1);
        return {
            month: m,
            average: Math.round(avg * 10) / 10,
            count: monthData.length,
        };
    });

    // 월별 최고/최저 점수
    const monthExtremes = months.map((m) => {
        const monthData = data.filter((d) => d.month === m);
        if (monthData.length === 0) return { month: m, max: 0, min: 0 };
        const scores = monthData.map((d: any) => d.score);
        return {
            month: m,
            max: Math.max(...scores),
            min: Math.min(...scores),
        };
    });

    return (
        <div className="space-y-6">
            {/* 월별 팀 평균 점수 추이 (라인 차트) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    📊 월별 팀 평균 점수 추이
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthAverages}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="month"
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                        />
                        <YAxis
                            domain={[0, 100]}
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="average"
                            stroke="#2563eb"
                            strokeWidth={3}
                            name="평균 점수"
                            dot={{ fill: "#2563eb", r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* 월별 참여 인원 수 (바 차트) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    👥 월별 리포트 생성 건수
                </h2>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthAverages}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="month"
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                        />
                        <YAxis
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                            }}
                        />
                        <Bar dataKey="count" fill="#10b981" name="리포트 수" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* 월별 최고/최저 점수 추이 */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    📈 월별 최고/최저 점수 추이
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthExtremes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="month"
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                        />
                        <YAxis
                            domain={[0, 100]}
                            stroke="#6b7280"
                            style={{ fontSize: "12px" }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="max"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="최고 점수"
                            dot={{ fill: "#10b981", r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="min"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="최저 점수"
                            dot={{ fill: "#ef4444", r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

