import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useSpeech } from "../../hooks/useSpeech";

export default function AdminConsole() {
    const [reports, setReports] = useState<any[]>([]);
    const [insights, setInsights] = useState<any[]>([]);
    const { speak } = useSpeech();

    useEffect(() => {
        const loadData = async () => {
            try {
                const repSnap = await getDocs(query(collection(db, "logs"), orderBy("timestamp", "desc")));
                const insSnap = await getDocs(query(collection(db, "insights"), orderBy("createdAt", "desc")));
                setReports(repSnap.docs.map((d) => d.data()));
                setInsights(insSnap.docs.map((d) => d.data()));
            } catch (error) {
                console.error("데이터 로드 오류:", error);
            }
        };

        loadData();
    }, []);

    const downloadPDF = async (path: string) => {
        try {
            const url = `https://firebasestorage.googleapis.com/v0/b/${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com/o/${encodeURIComponent(path)}?alt=media`;
            window.open(url, "_blank");
            speak("리포트를 다운로드합니다.");
        } catch (err) {
            console.error("PDF 다운로드 오류:", err);
            speak("파일을 불러올 수 없습니다.");
        }
    };

    const shareSlack = async (msg: string) => {
        try {
            speak("슬랙으로 전송합니다.");
            const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "yago-vibe-ai";
            await fetch(`https://asia-northeast3-${projectId}.cloudfunctions.net/slackShare`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: `📊 YAGO SPORTS 리포트 공유: ${msg}` }),
            });
            speak("슬랙 전송이 완료되었습니다.");
        } catch (err) {
            console.error("Slack 전송 오류:", err);
            speak("슬랙 전송에 실패했습니다.");
        }
    };

    const regenerateReport = async () => {
        try {
            speak("리포트를 다시 생성합니다.");
            const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "yago-vibe-ai";
            await fetch(`https://asia-northeast3-${projectId}.cloudfunctions.net/vibeReport?create=true`);
            speak("리포트 재생성이 완료되었습니다.");
        } catch (err) {
            console.error("리포트 재생성 오류:", err);
            speak("리포트 재생성에 실패했습니다.");
        }
    };

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-2xl shadow-lg">
                <h1 className="text-4xl font-bold mb-2">⚙️ YAGO SPORTS 관리 콘솔</h1>
                <p className="text-lg opacity-90">AI 자동화 시스템 제어 센터</p>
            </div>

            {/* 1️⃣ 인사이트 카드 */}
            <section className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                    <span>🤖</span>
                    <span>최근 AI 인사이트</span>
                </h2>
                {insights.length === 0 ? (
                    <p className="text-gray-400">최근 생성된 인사이트가 없습니다.</p>
                ) : (
                    <div className="space-y-3">
                        {insights.slice(0, 3).map((insight, idx) => (
                            <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
                                <p className="text-sm font-medium text-gray-800">{insight.summary}</p>
                                <span className="text-xs text-gray-400">
                                    {insight.createdAt ? new Date(insight.createdAt).toLocaleString('ko-KR') : "시간 정보 없음"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* 2️⃣ 리포트 파일 목록 */}
            <section className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                    <span>📂</span>
                    <span>리포트 파일</span>
                </h2>
                <div className="divide-y divide-gray-100">
                    {reports
                        .filter((r) => r.type?.includes("Report"))
                        .slice(0, 5)
                        .map((report, idx) => (
                            <div key={idx} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-800">{report.summary || "리포트"}</p>
                                    <span className="text-xs text-gray-400">
                                        {report.timestamp ? new Date(report.timestamp).toLocaleString('ko-KR') : "시간 정보 없음"}
                                    </span>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => downloadPDF(report.path || "")}
                                        className="px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 transition-colors"
                                    >
                                        📄 PDF
                                    </button>
                                    <button
                                        onClick={() => shareSlack(report.summary || report.message || "리포트")}
                                        className="px-3 py-1 bg-green-500 text-white rounded-md text-xs hover:bg-green-600 transition-colors"
                                    >
                                        📱 Slack
                                    </button>
                                </div>
                            </div>
                        ))}
                </div>
            </section>

            {/* 3️⃣ 제어 패널 */}
            <section className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                    <span>🧠</span>
                    <span>AI 제어 패널</span>
                </h2>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={regenerateReport}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors font-semibold"
                    >
                        🔄 리포트 재생성
                    </button>
                    <button
                        onClick={() => speak("이번 주 리포트 요약을 읽어드립니다.")}
                        className="px-6 py-3 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition-colors font-semibold"
                    >
                        🎙️ 음성 요약
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition-colors font-semibold"
                    >
                        🔄 새로고침
                    </button>
                </div>
            </section>
        </div>
    );
}

