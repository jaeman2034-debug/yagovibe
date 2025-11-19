import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type VoicePreset = {
    label: string;
    value: string; // ex) "ko-KR-Standard-A"
};

const VOICES: VoicePreset[] = [
    { label: "🇰🇷 여성 A", value: "ko-KR-Standard-A" },
    { label: "🇰🇷 남성 B", value: "ko-KR-Standard-B" },
    { label: "🇰🇷 여성 C", value: "ko-KR-Standard-C" },
    { label: "🇰🇷 남성 D", value: "ko-KR-Standard-D" },
    { label: "🇺🇸 Female E", value: "en-US-Standard-E" },
    { label: "🇺🇸 Male F", value: "en-US-Standard-F" },
];

export default function AdminVoiceDashboard() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<string>("");
    const [audioURL, setAudioURL] = useState<string>("");
    const [voice, setVoice] = useState<string>("ko-KR-Standard-A");
    const [speed, setSpeed] = useState<number>(1.0);
    const [isPlaying, setIsPlaying] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Firestore: /reports/weekly 실시간 구독
    useEffect(() => {
        const ref = doc(db, "reports", "weekly");
        const unsub = onSnapshot(ref, (snap) => {
            const data = snap.data() || {};
            setSummary(data.summary || "");
            setAudioURL(data.audioURL || "");
            setVoice(data.voice || "ko-KR-Standard-A");
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // 오디오 태그 생성/관리
    useEffect(() => {
        if (!audioURL) return;

        const audio = new Audio(audioURL);
        audioRef.current = audio;
        audio.playbackRate = speed;

        const onEnd = () => setIsPlaying(false);
        audio.addEventListener("ended", onEnd);

        return () => {
            audio.pause();
            audio.removeEventListener("ended", onEnd);
            audioRef.current = null;
        };
    }, [audioURL]);

    // 재생 속도 변경 반영
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    }, [speed]);

    const wordCount = useMemo(() => {
        return summary ? summary.trim().split(/\s+/).length : 0;
    }, [summary]);

    const handlePlayPause = async () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            try {
                await audioRef.current.play();
                setIsPlaying(true);
            } catch (e) {
                console.error(e);
            }
        }
    };

    // 보이스 변경 → Firestore 업데이트 → Step 17 함수가 자동으로 TTS+PDF 재생성
    const handleChangeVoice = async (v: string) => {
        setVoice(v);
        const ref = doc(db, "reports", "weekly");
        await updateDoc(ref, { voice: v }); // generateTTSAndPDF 트리거
    };

    if (loading) {
        return (
            <div className="w-full max-w-4xl mx-auto p-6 text-center text-gray-500">
                로딩 중…
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6">
            {/* 헤더 */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h1 className="text-xl md:text-2xl font-bold">
                    🎧 AI 리포트 음성 대시보드
                </h1>
                <div className="text-sm text-gray-500">
                    단어수: <span className="font-semibold">{wordCount}</span> •
                    현재 보이스: <span className="font-semibold">{voice}</span>
                </div>
            </div>

            {/* 요약 카드 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">🧠 이번 주 요약</h2>
                    {audioURL ? (
                        <a
                            href={audioURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-600 hover:underline"
                        >
                            🔗 오디오 열기/다운로드
                        </a>
                    ) : (
                        <span className="text-sm text-gray-400">오디오 없음</span>
                    )}
                </div>
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                    {summary || "요약이 없습니다."}
                </p>
            </div>

            {/* 컨트롤 바 */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handlePlayPause}
                        className={`px-4 py-2 rounded-lg text-white ${
                            isPlaying ? "bg-rose-500 hover:bg-rose-600" : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                        disabled={!audioURL}
                    >
                        {isPlaying ? "⏸ 일시정지" : "▶️ 재생"}
                    </button>

                    {/* 속도 */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">속도</span>
                        <select
                            value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className="px-2 py-1 border rounded-md bg-white dark:bg-gray-900"
                        >
                            {[0.75, 1.0, 1.25, 1.5].map((s) => (
                                <option key={s} value={s}>
                                    {s}x
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 보이스 선택 */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">보이스</span>
                        <select
                            value={voice}
                            onChange={(e) => handleChangeVoice(e.target.value)}
                            className="px-2 py-1 border rounded-md bg-white dark:bg-gray-900"
                        >
                            {VOICES.map((v) => (
                                <option key={v.value} value={v.value}>
                                    {v.label} ({v.value})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 상태 힌트 */}
                <p className="text-xs text-gray-500 mt-1">
                    💡 보이스를 바꾸면 Firestore의 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">reports/weekly.voice</code> 가 업데이트되고,
                    서버의 TTS+PDF 생성 함수가 자동으로 새 음성으로 재생성합니다. (Step 17)
                </p>
            </div>

            {/* 미니 플레이 타임바 (옵션: 기본 <audio> 표시를 숨기고 커스텀만 사용) */}
            <details className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
                <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-300">
                    기본 오디오 컨트롤 표시 (문제 해결용)
                </summary>
                {audioURL ? (
                    <audio
                        className="mt-3 w-full"
                        src={audioURL}
                        controls
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        preload="none"
                    />
                ) : (
                    <p className="mt-2 text-sm text-gray-400">오디오 없음</p>
                )}
            </details>
        </div>
    );
}

