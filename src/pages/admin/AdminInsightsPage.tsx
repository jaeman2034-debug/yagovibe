import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface HistoryReport {
    id: string;
    summary?: string;
    score?: number;
    trend?: "up" | "down" | string;
    createdAt?: any;
}

export default function AdminInsightsPage() {
    const [reports, setReports] = useState<HistoryReport[]>([]);

    useEffect(() => {
        // 실제 저장 경로에 맞춤: reports/weekly/history/{YYYY-MM-DD or WeekXX}
        const q = query(
            collection(db, "reports", "weekly", "history"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as HistoryReport[];
            setReports(data);
        });
        return () => unsub();
    }, []);

    const chartData = useMemo(() => reports.slice().reverse(), [reports]);

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold text-center">📊 관리자 AI 리포트 인사이트</h1>

            {/* 그래프 */}
            <Card className="shadow-md">
                <CardContent className="h-[300px] p-4">
                    <div className="font-semibold mb-2">주간 점수 추이</div>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="id" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* 테이블 */}
            <Card className="shadow-md">
                <CardContent className="p-4">
                    <div className="font-semibold mb-2">📅 리포트 이력</div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-t">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="p-2">Week</th>
                                    <th className="p-2">Score</th>
                                    <th className="p-2">Trend</th>
                                    <th className="p-2">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((r) => (
                                    <tr key={r.id} className="border-b dark:border-gray-700">
                                        <td className="p-2 font-medium">{r.id}</td>
                                        <td className="p-2">{r.score ?? "-"}</td>
                                        <td className="p-2">{r.trend === "up" ? "📈 상승" : r.trend === "down" ? "📉 하락" : "-"}</td>
                                        <td className="p-2 text-gray-500">{r.createdAt?.toDate?.().toLocaleDateString?.() || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


