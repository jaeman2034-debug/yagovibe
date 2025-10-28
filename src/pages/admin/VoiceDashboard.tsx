import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import YagoLayout from "@/layouts/YagoLayout";

export default function VoiceDashboard() {
    const [teams, setTeams] = useState<any[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "teamSummaries"), (snap) => {
            const data = snap.docs.map((d) => d.data());
            setTeams(data);
        });
        return () => unsub();
    }, []);

    const speakSummary = (summary: string) => {
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance(summary);
        utter.lang = "ko-KR";
        synth.speak(utter);
    };

    return (
        <YagoLayout title="🎧 AI Voice Dashboard Pro">
            <p className="text-gray-600 mb-6">AI가 자동 생성한 팀별 활동 요약 리포트입니다.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((t) => (
                    <div
                        key={t.teamId}
                        className={`p-6 rounded-2xl shadow-md border ${t.level === "매우 높음"
                                ? "border-green-500 bg-green-50"
                                : t.level === "보통"
                                    ? "border-gray-400 bg-gray-50"
                                    : "border-red-400 bg-red-50"
                            }`}
                    >
                        <h2 className="text-lg font-semibold mb-2">{t.teamId}</h2>
                        <p className="text-sm text-gray-600">
                            👥 회원 {t.members}명 | ⚽ 경기 {t.matches}건
                        </p>
                        <p className="mt-2 text-gray-800">{t.summary}</p>
                        <p className="mt-2 font-semibold text-blue-700">📈 활동 수준: {t.level}</p>
                        <button
                            onClick={() => speakSummary(`${t.teamId} ${t.summary}`)}
                            className="mt-3 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm shadow"
                        >
                            🔊 음성으로 듣기
                        </button>
                    </div>
                ))}
            </div>
        </YagoLayout>
    );
}

