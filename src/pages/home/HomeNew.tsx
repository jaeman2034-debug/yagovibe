import { useState, useEffect } from "react";
import { exportReportToPDF } from "@/utils/exportReport";
import { useTTS } from "@/hooks/useTTS";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function HomeNew() {
  const [report, setReport] = useState("이번 주 리포트를 불러오는 중입니다...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("📡 AI Weekly Summary 구독 시작...");
    const unsub = onSnapshot(doc(db, "reports", "weekly", "data", "summary"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        console.log("✅ AI 요약 데이터 수신:", data);
        const summaryText = `신규 가입자: ${data.newUsers}명\n활성 사용자: ${data.activeUsers}명\n성장률: ${data.growthRate}\n\n${data.highlight}\n\n${data.recommendation}`;
        setReport(summaryText);
      } else {
        console.log("⚠️ 리포트 문서가 없습니다.");
        setReport("리포트를 준비 중입니다...");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const { voices, selectedVoice, setSelectedVoice, rate, setRate, pitch, setPitch, speak, stop } =
    useTTS(report, false);

  const handleExport = async () => exportReportToPDF(report, "report-section");

  const handleSpeak = () => {
    speak(report);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-6">
      <h1 className="text-2xl font-bold">🧠 AI 리포트 내비게이터</h1>

      <div
        id="report-section"
        className="w-full max-w-lg bg-white dark:bg-gray-800 p-4 rounded-xl shadow text-center"
      >
        {loading ? (
          <p className="text-gray-500">📡 리포트를 불러오는 중...</p>
        ) : (
          <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-line">
            {report}
          </p>
        )}
      </div>

      {/* 🎚️ 음성 제어 UI */}
      <div className="w-full max-w-md space-y-3 p-4 border rounded-xl bg-white shadow-sm">
        {/* 음성 선택 */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-600 mb-1">🎙️ 음성 선택</label>
          <select
            value={selectedVoice?.name || ""}
            onChange={(e) => setSelectedVoice(voices.find(v => v.name === e.target.value) || null)}
            className="border rounded-md p-2 text-sm"
          >
            {voices.map((v, i) => (
              <option key={i} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </div>

        {/* 속도 조절 */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-600 mb-1">⚡ 말 속도: {rate.toFixed(1)}</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="accent-indigo-500"
          />
        </div>

        {/* 제어 버튼 */}
        <div className="flex justify-center space-x-3 pt-2">
          <button
            onClick={handleSpeak}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            ▶ 읽기
          </button>
          <button
            onClick={stop}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            ⏸ 정지
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            💾 PDF
          </button>
        </div>
      </div>
    </div>
  );
}

