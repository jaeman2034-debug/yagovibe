import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend);

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor: string;
        backgroundColor: string;
        tension: number;
    }[];
}

export default function AdminSummaryChart() {
    const [chartData, setChartData] = useState<ChartData | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "stats", "weeklySummary"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("📡 Firestore 데이터 수신:", data);

                setChartData({
                    labels: data.labels || ["1주차", "2주차", "3주차", "4주차"],
                    datasets: [
                        {
                            label: "신규 가입자 수",
                            data: data.signups || [12, 19, 14, 23],
                            borderColor: "#3b82f6",
                            backgroundColor: "rgba(59,130,246,0.3)",
                            tension: 0.3,
                        },
                        {
                            label: "활성 사용자 수",
                            data: data.activeUsers || [18, 25, 22, 28],
                            borderColor: "#10b981",
                            backgroundColor: "rgba(16,185,129,0.3)",
                            tension: 0.3,
                        },
                    ],
                });
            } else {
                console.log("⚠️ Firestore 문서가 존재하지 않습니다. 기본 데이터 사용");
                // Firestore에 문서가 없을 경우 기본 데이터 사용
                setChartData({
                    labels: ["1주차", "2주차", "3주차", "4주차"],
                    datasets: [
                        {
                            label: "신규 가입자 수",
                            data: [12, 19, 14, 23],
                            borderColor: "#3b82f6",
                            backgroundColor: "rgba(59,130,246,0.3)",
                            tension: 0.3,
                        },
                        {
                            label: "활성 사용자 수",
                            data: [18, 25, 22, 28],
                            borderColor: "#10b981",
                            backgroundColor: "rgba(16,185,129,0.3)",
                            tension: 0.3,
                        },
                    ],
                });
            }
        });
        return () => unsub();
    }, []);

    if (!chartData) return <p className="text-gray-400 text-center p-4">📡 데이터 불러오는 중...</p>;

    const options = {
        responsive: true,
        plugins: {
            legend: { position: "top" as const },
            title: { display: true, text: "AI 분석 기반 활동 통계 (주간)", font: { size: 18 } },
        },
    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow-md mt-6">
            <Line data={chartData} options={options} />
        </div>
    );
}
