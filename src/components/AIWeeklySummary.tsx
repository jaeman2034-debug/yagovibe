import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

/**
 * 🧠 AI 주간 요약 리포트 컴포넌트
 * Firestore의 reports/weeklyReport에서 실시간 데이터를 가져옴
 */
export default function AIWeeklySummary() {
    const [summary, setSummary] = useState<string>("");
    const [updatedAt, setUpdatedAt] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("📡 AI Weekly Summary 구독 시작...");

        const unsub = onSnapshot(doc(db, "reports", "weeklyReport"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                console.log("✅ AI 요약 데이터 수신:", data);
                setSummary(data.summary || "리포트를 불러오는 중입니다...");
                setUpdatedAt(data.updatedAt || "");
            } else {
                console.log("⚠️ 리포트 문서가 없습니다.");
                setSummary("리포트를 준비 중입니다...");
            }
            setLoading(false);
        });

        return () => {
            console.log("📡 AI Weekly Summary 구독 해제");
            unsub();
        };
    }, []);

    if (loading) {
        return (
            <div className="bg-white shadow-md rounded-2xl p-6 mt-6">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">📡 리포트를 불러오는 중입니다...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 shadow-md rounded-2xl p-6 mt-6 border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🧠</span>
                <h2 className="text-xl font-bold text-gray-800">AI 자동 요약 리포트</h2>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {summary}
            </p>
            {updatedAt && (
                <p className="text-sm text-gray-500 mt-3">
                    📅 업데이트: {new Date(updatedAt).toLocaleString("ko-KR")}
                </p>
            )}
        </div>
    );
}

