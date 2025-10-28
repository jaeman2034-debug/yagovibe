import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function VoiceAnalytics() {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState("");
    const [chartData, setChartData] = useState<any>(null);

    const handleQuery = async (text: string) => {
        setLoading(true);
        const fn = getFunctions();
        const voiceAnalytics = httpsCallable(fn, "voiceAnalyticsAssistant");
        try {
            const res: any = await voiceAnalytics({ text });
            setSummary(res.data.summary);
            setChartData(res.data.chartData);
            setLoading(false);
        } catch (err) {
            console.error("❌ Voice Analytics 오류", err);
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">🎤 Voice Analytics Assistant</h2>
            <button
                onClick={() => handleQuery("이번 주 경기 활동 요약 보여줘")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow"
            >
                이번 주 통계 요청
            </button>

            {loading && <p className="text-gray-500 mt-4">AI 분석 중...</p>}

            {summary && (
                <div className="mt-4">
                    <p className="font-medium mb-2">🧠 AI 요약:</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
                </div>
            )}

            {chartData && (
                <div className="mt-4">
                    <p className="font-medium mb-2">📊 차트 데이터:</p>
                    <pre className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                        {JSON.stringify(chartData, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

