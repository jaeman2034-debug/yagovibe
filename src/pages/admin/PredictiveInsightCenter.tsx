import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import YagoLayout from "@/layouts/YagoLayout";

export default function PredictiveInsightCenter() {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "predictiveReports"), (snap) => {
            setReports(snap.docs.map((d) => d.data()));
        });
        return () => unsub();
    }, []);

    if (!reports.length) return <p>📉 예측 리포트 없음</p>;

    const latest = reports[0];

    return (
        <YagoLayout title="🔮 AI Predictive Insight Center">
            <p className="text-gray-600 mb-6">
                향후 4주간의 운영 예측 및 AI 분석 결과입니다.
            </p>

            <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-gray-800 mb-3">{latest.forecast.globalSummary}</p>
                <table className="w-full text-sm text-left border-t">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2">팀</th>
                            <th>참여율</th>
                            <th>만족도</th>
                            <th>리스크</th>
                            <th>요약</th>
                        </tr>
                    </thead>
                    <tbody>
                        {latest.forecast.teamForecasts.map((t: any, i: number) => (
                            <tr key={i} className="border-b">
                                <td className="py-2 font-semibold">{t.team}</td>
                                <td>{t.참여율}</td>
                                <td>{t.만족도}</td>
                                <td>{t.리스크}</td>
                                <td>{t.요약}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <a
                    href={`https://storage.googleapis.com/YOUR_BUCKET/${latest.storagePath}`}
                    target="_blank"
                    className="text-blue-600 underline mt-4 inline-block"
                >
                    📄 예측 리포트 PDF 다운로드
                </a>
            </div>
        </YagoLayout>
    );
}

