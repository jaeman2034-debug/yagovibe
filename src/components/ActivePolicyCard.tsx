import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function ActivePolicyCard() {
    const [policy, setPolicy] = useState<any>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "governancePolicies", "active"), (d) => setPolicy(d.data()));
        return () => unsub();
    }, []);

    if (!policy) return <p>로딩 중...</p>;

    return (
        <div className="bg-white rounded-2xl shadow-md p-6 mt-8">
            <h2 className="text-lg font-bold mb-3">🧩 Active Governance Policy</h2>
            <p className="text-sm text-gray-500 mb-2">
                마지막 갱신: {new Date(policy.updatedAt?.toDate?.() || policy.updatedAt).toLocaleString("ko-KR")}
            </p>
            <p className="text-gray-700">🧠 {policy.comment}</p>

            <div className="mt-4">
                <p>📊 만족도 하락 기준: {policy.alertThreshold?.satisfactionDrop || "N/A"}%</p>
                <p>📉 활동수준 경보 기준: {policy.alertThreshold?.lowActivityLevel || "N/A"}</p>
                <p>💤 피로도 상승 기준: {policy.alertThreshold?.fatigueRise || "N/A"}%</p>
            </div>

            <div className="mt-4 border-t pt-3">
                <p className="font-semibold text-blue-600">🕒 리포트 주기: {policy.reportPolicy?.generationFrequency || "N/A"}</p>
                <p className="font-semibold text-blue-600">📝 요약 수준: {policy.reportPolicy?.summaryLength || "N/A"}</p>
            </div>
        </div>
    );
}

