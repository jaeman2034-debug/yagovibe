import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface ChartDataPoint {
    name: string;
    "신규 가입자 수": number;
    "활성 사용자 수": number;
}

export default function AdminSummaryChart() {
    const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "reports/weekly/data/analytics"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("📡 Firestore 데이터 수신:", data);

                const labels = data.labels || ["1주차", "2주차", "3주차", "4주차"];
                const newUsers = data.newUsers || [12, 19, 14, 23];
                const activeUsers = data.activeUsers || [18, 25, 22, 28];

                const formattedData: ChartDataPoint[] = labels.map((label: string, index: number) => ({
                    name: label,
                    "신규 가입자 수": newUsers[index] || 0,
                    "활성 사용자 수": activeUsers[index] || 0,
                }));

                setChartData(formattedData);
            } else {
                console.log("⚠️ Firestore 문서가 존재하지 않습니다. 기본 데이터 사용");
                const labels = ["1주차", "2주차", "3주차", "4주차"];
                const newUsers = [12, 19, 14, 23];
                const activeUsers = [18, 25, 22, 28];

                const formattedData: ChartDataPoint[] = labels.map((label, index) => ({
                    name: label,
                    "신규 가입자 수": newUsers[index],
                    "활성 사용자 수": activeUsers[index],
                }));

                setChartData(formattedData);
            }
        });
        return () => unsub();
    }, []);

    if (!chartData) return <p className="text-gray-400 text-center p-4">📡 데이터 불러오는 중...</p>;

    // React 19 호환성 문제로 인해 임시로 데이터만 표시
    // TODO: recharts가 React 19를 지원하면 차트로 복원
    return (
        <div className="w-full h-full p-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">📊 주간 통계 데이터</h3>
                <div className="space-y-3">
                    {chartData.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                            <div className="flex gap-4">
                                <span className="text-blue-600 dark:text-blue-400">
                                    신규: {item["신규 가입자 수"]}
                                </span>
                                <span className="text-green-600 dark:text-green-400">
                                    활성: {item["활성 사용자 수"]}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                    ⚠️ 차트는 React 19 호환성 문제로 인해 데이터 표시로 대체되었습니다.
                </p>
            </div>
        </div>
    );
}
