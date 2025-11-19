import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

type Props = {
    user?: {
        name?: string;
        nickname?: string;
        favoriteSports?: string[];
        birth?: string;
        createdAt?: number;
    } | null;
};

export default function AIWelcomeCard({ user }: Props) {
    const [message, setMessage] = useState("오늘도 좋은 하루예요 ⚽");

    useEffect(() => {
        const displayName = user?.nickname || user?.name;
        if (!displayName) return;

        const favoriteSport = user?.favoriteSports?.[0] || "스포츠";
        const greetings = [
            `안녕하세요, ${displayName}님! 오늘도 활기찬 플레이 기대합니다.`,
            `${displayName}님, 오늘은 ${favoriteSport} 관련 소식이 있어요! 🔥`,
            `좋은 하루예요 ${displayName}님! 새로운 팀 소식이 있어요.`,
        ];
        setMessage(greetings[Math.floor(Math.random() * greetings.length)]);
    }, [user]);

    const userName = user?.nickname || user?.name || "사용자";

    return (
        <div className="w-full max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center space-x-3">
                <Sparkles size={28} className="text-yellow-300" />
                <div>
                    <p className="font-semibold text-lg">안녕하세요, {userName}님! 👋</p>
                    <p className="text-sm opacity-90">{message}</p>
                </div>
            </div>
            <div className="mt-3 flex items-center space-x-2 text-xs">
                <span className="bg-white/20 px-3 py-1 rounded-full">
                    📅 {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full">
                    ⭐ 활성 사용자
                </span>
            </div>
        </div>
    );
}

