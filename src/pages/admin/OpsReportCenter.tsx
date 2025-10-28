import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import YagoLayout from "@/layouts/YagoLayout";

export default function OpsReportCenter() {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "opsReports"), (snap) =>
            setReports(snap.docs.map((d) => d.data()))
        );
        return () => unsub();
    }, []);

    return (
        <YagoLayout title="📊 AI Ops Report Center">
            <p className="text-gray-600 mb-6">
                전사 운영 리포트 자동 생성 및 Slack 전송 이력
            </p>

            <div className="space-y-4">
                {reports.map((r, i) => (
                    <div key={i} className="p-4 bg-white rounded-2xl shadow-md">
                        <p className="text-sm text-gray-500">
                            🕒 {new Date(r.createdAt?.toDate?.() || r.createdAt).toLocaleString("ko-KR")}
                        </p>
                        <p className="mt-2 text-gray-800 whitespace-pre-wrap">{r.summary}</p>
                        <a
                            href={`https://storage.googleapis.com/YOUR_BUCKET/${r.storagePath}`}
                            target="_blank"
                            className="text-blue-600 underline mt-2 inline-block"
                        >
                            📄 리포트 PDF 다운로드
                        </a>
                    </div>
                ))}
            </div>
        </YagoLayout>
    );
}

