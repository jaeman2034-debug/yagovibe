import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function VoiceFeedbackForm() {
    const [team, setTeam] = useState("청룡팀");
    const [text, setText] = useState("");
    const [result, setResult] = useState<any>(null);

    const handleSubmit = async () => {
        const fn = getFunctions();
        const analyze = httpsCallable(fn, "analyzeVoiceFeedback");
        const res: any = await analyze({ team, text });
        setResult(res.data.analysis);
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-md max-w-xl mx-auto">
            <h2 className="text-xl font-bold mb-4">🎙️ AI Voice Feedback Center</h2>

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
                placeholder="음성 인식 결과 텍스트 입력"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="border rounded-lg p-2 w-full h-24 mb-3"
            />

            <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow"
            >
                감정 분석 실행
            </button>

            {result && (
                <div className="mt-4 text-sm text-gray-800">
                    <p>감정: {result.감정}</p>
                    <p>피로도: {result.피로도}</p>
                    <p>만족도: {result.만족도}</p>
                    <p>요약: {result.요약}</p>
                </div>
            )}
        </div>
    );
}

