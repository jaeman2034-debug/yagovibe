import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import YagoLayout from "@/layouts/YagoLayout";

export default function AiOrchestratorDashboard() {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, "orchestrationLogs"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => setLogs(snap.docs.map((d) => d.data())));
        return () => unsub();
    }, []);

    return (
        <YagoLayout title="🎛️ AI VIBE Orchestrator 1.0">
            <p className="text-gray-600 mb-6">
                모든 AI 모듈의 실행 상태, 요약, 자동 조치 내역을 한 곳에서 모니터링합니다.
            </p>

            {logs.map((log, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md p-6 mb-6">
                    <p className="text-sm text-gray-500">
                        🕒 {new Date(log.createdAt?.toDate?.() || log.createdAt).toLocaleString("ko-KR")}
                    </p>
                    <p className="text-gray-800 mt-3 whitespace-pre-wrap">{log.summary}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {log.modules.map((m: any, j: number) => (
                            <div
                                key={j}
                                className={`p-2 rounded-xl ${m.state.includes("✅") ? "bg-green-50" : "bg-red-50"
                                    }`}
                            >
                                <p className="font-semibold">{m.name}</p>
                                <p className="text-sm">{m.state}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </YagoLayout>
    );
}

