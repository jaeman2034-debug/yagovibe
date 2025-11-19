import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportHistoryChart() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // reports/weekly 문서의 하위 컬렉션 history 를 구독 (컬렉션 경로는 세그먼트 수가 홀수여야 함)
        const q = query(
            collection(db, "reports", "weekly", "history"),
            orderBy("createdAt", "asc")
        );
        
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setHistory(data);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    if (loading) {
        return (
            <Card className="shadow-md dark:bg-gray-800">
                <CardContent>
                    <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                        📈 AI 리포트 생성 이력
                    </h2>
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-3 text-gray-600 dark:text-gray-400">데이터 불러오는 중...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (history.length === 0) {
        return (
            <Card className="shadow-md dark:bg-gray-800">
                <CardContent>
                    <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                        📈 AI 리포트 생성 이력
                    </h2>
                    <div className="text-center py-8 text-gray-500">
                        리포트 생성 이력이 없습니다.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartData = history.map((h) => ({
        name: h.id,
        "AI 점수": h.aiScore || 0,
        "사용자 수": h.totalUsers || 0,
    }));

    return (
        <Card className="shadow-md dark:bg-gray-800">
            <CardContent>
                <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
                    📈 AI 리포트 생성 이력
                </h2>
                <div className="h-64">
                    <LineChart width={800} height={256} data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="name" 
                            stroke="#6B7280"
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                            stroke="#6B7280"
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                            contentStyle={{
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Line 
                            type="monotone" 
                            dataKey="AI 점수" 
                            stroke="#4f46e5" 
                            strokeWidth={2}
                            dot={{ fill: "#4f46e5", r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="사용자 수" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={{ fill: "#10b981", r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </div>
            </CardContent>
        </Card>
    );
}

