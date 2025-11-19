import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

/**
 * 🧠 AI 주간 요약 리포트 컴포넌트
 * Firestore의 reports/weekly/data/summary에서 실시간 데이터를 가져옴
 * TTS(음성 낭독) 기능 포함
 */
export default function AIWeeklySummary() {
    const [summary, setSummary] = useState<string>("");
    const [updatedAt, setUpdatedAt] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        console.log("📡 AI Weekly Summary 구독 시작...");

        const unsub = onSnapshot(doc(db, "reports/weekly/data/summary"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                console.log("✅ AI 요약 데이터 수신:", data);
                // summary 객체를 문자열로 변환
                const summaryText = `신규 가입자: ${data.newUsers}명\n활성 사용자: ${data.activeUsers}명\n성장률: ${data.growthRate}\n\n${data.highlight}\n\n${data.recommendation}`;
                setSummary(summaryText);
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

    // 🎙️ TTS 음성 낭독 기능
    const handleSpeak = () => {
        if (!summary || summary === "리포트를 준비 중입니다...") return;

        const synth = window.speechSynthesis;

        // 이미 재생 중이면 중지
        if (isSpeaking) {
            synth.cancel();
            setIsSpeaking(false);
            return;
        }

        // 음성 낭독 시작
        const utter = new SpeechSynthesisUtterance(summary);
        utter.lang = "ko-KR";
        utter.rate = 1.5; // 최적 속도: 끊기지 않고 완전히 재생됨 [[memory:5313820]]
        utter.pitch = 1.0;

        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);

        synth.speak(utter);
    };

    if (loading) {
        return (
            <div className="bg-white shadow-md rounded-2xl p-6">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">📡 리포트를 불러오는 중입니다...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 shadow-md rounded-2xl p-6 border border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🧠</span>
                    <h2 className="text-xl font-bold text-gray-800">AI 자동 요약 리포트</h2>
                </div>
                <button
                    onClick={handleSpeak}
                    disabled={summary === "리포트를 준비 중입니다..."}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        isSpeaking
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                    } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                >
                    {isSpeaking ? "🛑 낭독 중지" : "🎙️ 리포트 듣기"}
                </button>
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

