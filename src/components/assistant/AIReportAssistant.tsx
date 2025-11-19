import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 🧠 AI 리포트 대화형 어시스턴트
 * 자연어 질문을 분석하여 Firestore 데이터를 기반으로 음성 응답 제공
 */
export default function AIReportAssistant() {
    const [isListening, setIsListening] = useState(false);
    const [lastQuestion, setLastQuestion] = useState("");
    const [lastAnswer, setLastAnswer] = useState("");

    const speak = (text: string) => {
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "ko-KR";
        utter.rate = 1.5; // 최적 속도
        utter.pitch = 1.0;
        synth.speak(utter);
    };

    const fetchData = async () => {
        const summaryRef = doc(db, "reports/weekly/data/summary");
        const analyticsRef = doc(db, "reports/weekly/data/analytics");
        
        const summarySnap = await getDoc(summaryRef);
        const analyticsSnap = await getDoc(analyticsRef);

        return {
            summary: summarySnap.exists() ? summarySnap.data() : null,
            analytics: analyticsSnap.exists() ? analyticsSnap.data() : null,
        };
    };

    const analyzeQuestion = async (text: string) => {
        setLastQuestion(text);
        const { summary, analytics } = await fetchData();

        if (!summary || !analytics) {
            const noDataMsg = "리포트를 찾을 수 없습니다.";
            speak(noDataMsg);
            setLastAnswer(noDataMsg);
            return;
        }

        const latestNew = analytics.newUsers[analytics.newUsers.length - 1] || 0;
        const latestActive = analytics.activeUsers[analytics.activeUsers.length - 1] || 0;
        const prevActive = analytics.activeUsers[analytics.activeUsers.length - 2] || latestActive;
        const diff = latestActive - prevActive;
        const percent = prevActive > 0 ? ((diff / prevActive) * 100).toFixed(1) : "0";

        let answer = "";

        // 질문 의도 분석
        if (text.includes("이번 주") && text.includes("활동")) {
            answer = `이번 주 활성 사용자는 ${latestActive}명이며, 지난주 대비 ${percent}% ${
                diff >= 0 ? "증가" : "감소"
            }했습니다.`;
        } else if (text.includes("신규") || text.includes("가입")) {
            answer = `이번 주 신규 가입자는 ${latestNew}명입니다.`;
        } else if (text.includes("요약") || text.includes("리포트")) {
            answer = `신규 가입자: ${summary.newUsers}명. 활성 사용자: ${summary.activeUsers}명. 성장률: ${summary.growthRate}. ${summary.highlight}. ${summary.recommendation}`;
        } else if (text.includes("비교") || text.includes("지난")) {
            answer = `지난주 ${prevActive}명에서 이번주 ${latestActive}명으로 ${Math.abs(diff)}명 ${
                diff >= 0 ? "증가" : "감소"
            }했습니다.`;
        } else if (text.includes("성장률") || text.includes("증가")) {
            answer = `이번 주 성장률은 ${summary.growthRate}이며, ${summary.highlight}.`;
        } else if (text.includes("추천") || text.includes("제안")) {
            answer = `AI 추천: ${summary.recommendation}`;
        } else {
            answer = "죄송합니다. 그 질문에 대한 데이터는 아직 분석되지 않았습니다. 이번 주 활동률이나 신규 가입자에 대해 물어보세요.";
        }

        setLastAnswer(answer);
        speak(answer);
    };

    const startListening = () => {
        if (!("webkitSpeechRecognition" in window)) {
            alert("이 브라우저에서는 음성 인식이 지원되지 않습니다.");
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        
        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript.trim();
            console.log("🎤 질문 인식:", text);
            analyzeQuestion(text);
        };

        recognition.onerror = (event: any) => {
            console.error("❌ 음성 인식 오류:", event.error);
            setIsListening(false);
        };

        recognition.start();
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-6 p-6 bg-white rounded-xl shadow-md space-y-3 text-center">
            <h2 className="text-lg font-bold text-blue-600">🧠 AI 리포트 어시스턴트</h2>
            <p className="text-gray-600 mb-2">
                "이번 주 활동률 어땠어?", "지난주랑 비교해줘" 같이 물어보세요.
            </p>

            <button
                onClick={startListening}
                disabled={isListening}
                className={`${
                    isListening ? "bg-red-600" : "bg-blue-600"
                } text-white rounded-lg px-6 py-2 font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {isListening ? "🎧 듣는 중..." : "🎤 질문하기"}
            </button>

            {lastQuestion && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left border border-gray-200 space-y-2">
                    <p className="text-gray-700">
                        <strong className="text-blue-600">Q:</strong> {lastQuestion}
                    </p>
                    <p className="text-gray-800">
                        <strong className="text-green-600">A:</strong> {lastAnswer}
                    </p>
                </div>
            )}
        </div>
    );
}

