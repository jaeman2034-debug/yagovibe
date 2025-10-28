import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function VoiceAdminConsole() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const executeCommand = async (text: string) => {
        setLoading(true);
        const fn = getFunctions();
        const adminCmd = httpsCallable(fn, "voiceAdminConsole");
        try {
            const res: any = await adminCmd({ text });
            setMessage(res.data.message);
        } catch (err) {
            console.error("❌ 관리자 명령 오류", err);
            setMessage("명령 처리 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">🎙️ AI 관리자 음성 콘솔</h2>
            <button
                onClick={() => executeCommand("청룡팀 신규 회원 추가해줘")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow"
            >
                테스트: 회원 추가 명령
            </button>

            {loading && <p className="text-gray-500 mt-4">AI 명령 처리 중...</p>}
            {message && <p className="mt-4 text-gray-800 whitespace-pre-wrap">{message}</p>}
        </div>
    );
}

