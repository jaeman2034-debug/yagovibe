import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import YagoLayout from "@/layouts/YagoLayout";

export default function AutonomousCenter() {
    const [actions, setActions] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, "autonomousActions"), orderBy("executedAt", "desc"));
        const unsub = onSnapshot(q, (snap) => setActions(snap.docs.map((d) => d.data())));
        return () => unsub();
    }, []);

    return (
        <YagoLayout title="🤖 AI Autonomous Action Center">
            <p className="text-gray-600 mb-6">
                예측 결과를 기반으로 AI가 직접 실행한 조치 내역입니다.
            </p>

            {actions.map((a, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md p-4 mb-3">
                    <p className="font-semibold">🏟️ {a.team}</p>
                    <p>⚙️ 조치: {a.action}</p>
                    <p>🧠 이유: {a.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        {new Date(a.executedAt?.toDate?.() || a.executedAt).toLocaleString("ko-KR")}
                    </p>
                </div>
            ))}
        </YagoLayout>
    );
}

