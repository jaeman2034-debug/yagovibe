import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function AutoInsights() {
    const [insights, setInsights] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, "insights"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) =>
            setInsights(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
        );
        return () => unsub();
    }, []);

    return (
        <div className="p-5 space-y-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
                <h1 className="text-3xl font-bold mb-2">🤖 AI 오토파일럿 리포트</h1>
                <p className="text-sm opacity-90">매일 오전 9시 자동 생성되는 AI 인사이트</p>
            </div>

            {insights.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 text-center">
                    <div className="text-4xl mb-2">🤖</div>
                    <p className="text-gray-500 dark:text-gray-400">아직 생성된 인사이트가 없습니다.</p>
                    <p className="text-sm text-gray-400 mt-2">
                        첫 번째 자동 리포트가 생성될 때까지 기다려주세요.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {insights.map((r) => (
                        <div
                            key={r.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition"
                        >
                            <h2 className="font-bold text-xl mb-3 text-gray-800 dark:text-gray-100">{r.title}</h2>
                            {r.bullets && r.bullets.length > 0 && (
                                <ul className="text-sm list-disc ml-6 mb-3 space-y-1 text-gray-600 dark:text-gray-300">
                                    {r.bullets.map((b: string, i: number) => (
                                        <li key={i}>{b}</li>
                                    ))}
                                </ul>
                            )}
                            {r.action && (
                                <p className="text-blue-600 dark:text-blue-400 mt-3 font-semibold">
                                    👉 {r.action}
                                </p>
                            )}
                            <p className="text-xs text-gray-400 mt-3">
                                {r.createdAt ? new Date(r.createdAt).toLocaleString('ko-KR') : '날짜 없음'}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

