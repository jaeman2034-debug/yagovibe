import { useState } from "react";
import { useVoiceMemory } from "@/hooks/useVoiceMemory";

export default function VoiceMemoryConsole() {
    const [messages, setMessages] = useState<string[]>([]);
    const { runMemoryCommand } = useVoiceMemory();

    const handleVoiceInput = async (text: string) => {
        const reply = await runMemoryCommand(text);
        setMessages((prev) => [...prev, `👤 ${text}`, `🤖 ${reply}`]);
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">🧠 Voice Memory Assistant</h2>
            <button
                onClick={() => handleVoiceInput("이번 주 리포트 만들어줘")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow"
            >
                명령: 리포트 생성
            </button>
            <button
                onClick={() => handleVoiceInput("그거 슬랙으로 보내줘")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg shadow ml-2"
            >
                명령: 리포트 전송
            </button>
            <div className="mt-4 space-y-1 text-sm text-gray-800">
                {messages.map((m, i) => (
                    <p key={i}>{m}</p>
                ))}
            </div>
        </div>
    );
}

