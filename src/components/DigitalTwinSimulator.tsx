import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function DigitalTwinSimulator() {
    const [team, setTeam] = useState("청룡팀");
    const [scenario, setScenario] = useState("");
    const [result, setResult] = useState<any>(null);

    const runSim = async () => {
        const fn = getFunctions();
        const sim = httpsCallable(fn, "runDigitalTwinSimulation");
        const res: any = await sim({ team, scenario });
        setResult(res.data.result);
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-md max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-4">🧠 AI Digital Twin Simulator</h2>

            <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="border rounded-lg p-2 mb-2 w-full"
            >
                <option>청룡팀</option>
                <option>백호팀</option>
                <option>아카데미</option>
            </select>

            <textarea
                placeholder="예: 훈련 빈도를 20% 줄이면 만족도가 어떻게 변할까?"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="border rounded-lg p-2 w-full h-24 mb-3"
            />

            <button onClick={runSim} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow">
                시뮬레이션 실행
            </button>

            {result && (
                <div className="mt-4 text-sm text-gray-800 space-y-1">
                    <p>📈 예상 참여율 변화: {result.예상참여율변화}</p>
                    <p>💖 예상 만족도: {result.예상만족도}</p>
                    <p>😴 예상 피로도: {result.예상피로도}</p>
                    <p>⚠️ 리스크 요인: {result.리스크요인}</p>
                    <p>💡 추천 전략: {result.추천전략}</p>
                </div>
            )}
        </div>
    );
}

