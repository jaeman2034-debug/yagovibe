import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface Report {
    id: string;
    totalUsers?: number;
    totalMatches?: number;
    noShowRate?: number;
    avgScore?: number;
    createdAt?: any;
}

export default function DashboardReportHistory() {
    const [reports, setReports] = useState<Report[]>([]);

    useEffect(() => {
        // 백업 경로와 일치: reports/weekly/history/{YYYY-MM-DD}
        const q = query(
            collection(db, "reports", "weekly", "history"),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Report[];
            setReports(data);
        });
        return () => unsub();
    }, []);

    if (reports.length === 0) {
        return <p className="text-center text-gray-500 py-10">📭 리포트 데이터가 없습니다.</p>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            <h2 className="text-2xl font-bold text-center mb-6">📊 주간 AI 리포트 추이</h2>

            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow">
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reports.slice(0, 8).reverse()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="id" tick={{ fill: "#6b7280" }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="totalUsers" stroke="#3b82f6" strokeWidth={2} />
                            <Line type="monotone" dataKey="totalMatches" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((r) => (
                    <div
                        key={r.id}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-all"
                    >
                        <h3 className="font-semibold text-lg mb-2">{r.id}</h3>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <li>👥 사용자 수: {r.totalUsers ?? 0}</li>
                            <li>⚽ 경기 수: {r.totalMatches ?? 0}</li>
                            <li>🚫 노쇼율: {(((r.noShowRate ?? 0) * 100).toFixed(1))}%</li>
                            <li>⭐ 평균 점수: {(r.avgScore ?? 0).toFixed(2)}</li>
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}


