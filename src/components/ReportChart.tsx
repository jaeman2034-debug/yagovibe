import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

/**
 * 📈 리포트 차트 컴포넌트
 */
export default function ReportChart({ data }: { data: any[] }) {
    return (
        <div className="w-full h-64">
            <ResponsiveContainer>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="#6B7280"
                    />
                    <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#6B7280"
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px'
                        }}
                    />
                    <Bar
                        dataKey="count"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

