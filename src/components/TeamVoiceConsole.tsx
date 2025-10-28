import { useState } from "react";
import { useTeamVoiceAgent } from "@/hooks/useTeamVoiceAgent";

export default function TeamVoiceConsole() {
    const { executeTeamCommand } = useTeamVoiceAgent();
    const [logs, setLogs] = useState<string[]>([]);

    const run = async (cmd: string) => {
        const reply = await executeTeamCommand(cmd);
        setLogs((prev) => [...prev, `👤 ${cmd}`, `🤖 ${reply}`]);
    };

    return (
        <div className="p-6 bg-white rounded-2xl shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">🏟️ 팀별 Voice Agent Console</h2>
            <div className="space-x-2">
                <button
                    onClick={() => run("청룡팀 리포트 만들어줘")}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg"
                >
                    청룡팀 리포트
                </button>
                <button
                    onClick={() => run("백호팀 일정 알려줘")}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg"
                >
                    백호팀 일정
                </button>
                <button
                    onClick={() => run("아카데미 회원 추가해줘")}
                    className="px-3 py-2 bg-orange-500 text-white rounded-lg"
                >
                    아카데미 회원추가
                </button>
            </div>

            <div className="mt-4 space-y-1 text-sm text-gray-800">
                {logs.map((l, i) => (
                    <p key={i}>{l}</p>
                ))}
            </div>
        </div>
    );
}
