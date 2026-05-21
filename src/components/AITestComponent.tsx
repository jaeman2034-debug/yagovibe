// 🎯 YAGO SPORTS AI 테스트 컴포넌트
import { useState } from "react";
import { useAI } from "@/hooks/useAI";

export default function AITestComponent() {
    const [command, setCommand] = useState("");
    const [result, setResult] = useState("");
    const { processVoiceCommand } = useAI(null);

    const handleTest = async () => {
        if (!command.trim()) return;

        try {
            await processVoiceCommand(command);
            setResult(`✅ "${command}" 명령을 처리했습니다.`);
        } catch (error) {
            setResult(`❌ 오류: ${error}`);
        }
    };

    return (
        <div className="p-6 w-full max-w-none px-3 md:mx-auto md:max-w-3xl bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-center">🧠 AI 테스트</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        테스트 명령어
                    </label>
                    <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        placeholder="예: 근처 카페 찾아줘"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    onClick={handleTest}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                    🚀 AI 명령 실행
                </button>

                {result && (
                    <div className={`p-3 rounded-md ${result.includes("❌")
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                        {result}
                    </div>
                )}

                <div className="text-sm text-gray-600">
                    <p className="font-semibold mb-2">테스트 명령어 예시:</p>
                    <ul className="space-y-1">
                        <li>• "근처 카페 찾아줘"</li>
                        <li>• "강남역으로 가자"</li>
                        <li>• "편의점 검색해줘"</li>
                        <li>• "홈으로 가자"</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
