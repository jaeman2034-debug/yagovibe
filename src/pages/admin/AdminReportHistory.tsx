import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ReportExport from "@/components/ReportExport";

interface Report {
    id: string;
    summary?: string;
    score?: number;
    createdAt?: any;
}

export default function AdminReportHistory() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 실제 백업 경로: reports/weekly/history/{YYYY-MM-DD}
                const q = query(
                    collection(db, "reports", "weekly", "history"),
                    orderBy("createdAt", "desc")
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...(doc.data() as any),
                })) as Report[];
                setReports(data);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const chartData = useMemo(() => {
        const rows = reports.slice().reverse();
        return rows.map((r) => ({
            name: r.id,
            score: typeof r.score === "number" ? r.score : ((r as any).aiScore ?? 0),
        }));
    }, [reports]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center text-gray-500">불러오는 중...</div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <h2 className="text-2xl font-bold text-center">📊 주간 리포트 이력</h2>

            {/* 그래프 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md">
                <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 테이블 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">날짜</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">AI 요약</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">신뢰도 점수</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {reports.map((r) => (
                            <tr key={r.id}>
                                <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{r.id}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{r.summary || (r as any).highlight || "-"}</td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-indigo-500">{typeof r.score === "number" ? r.score : ((r as any).aiScore ?? 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 내보내기 섹션 */}
            <ReportExport />
        </div>
    );
}


