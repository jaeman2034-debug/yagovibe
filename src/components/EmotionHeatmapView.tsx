import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function EmotionHeatmapView() {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "emotionReports"), (snap) => {
            setReports(snap.docs.map((d) => d.data()));
        });
        return () => unsub();
    }, []);

    return (
        <div className="p-8">
            <h1 className="text-xl font-bold mb-4">🎭 Emotion Heatmap Center</h1>
            <p className="text-gray-600 mb-6">
                팀별 감정 변화 리포트를 주간 단위로 확인할 수 있습니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reports.map((r, i) => (
                    <div key={i} className="p-6 rounded-2xl shadow-md bg-white">
                        <h2 className="text-lg font-semibold mb-2">{r.team}</h2>
                        <p className="text-sm text-gray-600 mb-3">{r.summary}</p>
                        <a
                            href={`https://storage.googleapis.com/YOUR_BUCKET/${r.reportPath}`}
                            target="_blank"
                            className="text-blue-600 underline"
                        >
                            📄 리포트 PDF 다운로드
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}

