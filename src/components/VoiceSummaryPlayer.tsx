import { useState, useRef } from "react";

/**
 * 🎧 리포트 요약 음성 재생 컴포넌트
 */
export default function VoiceSummaryPlayer({ url }: { url: string }) {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = async () => {
        if (!audioRef.current) {
            audioRef.current = new Audio(url);
            audioRef.current.onended = () => setPlaying(false);
        }

        if (playing) {
            audioRef.current.pause();
            setPlaying(false);
        } else {
            try {
                await audioRef.current.play();
                setPlaying(true);
            } catch (error) {
                console.error("오디오 재생 실패:", error);
                alert("오디오 재생에 실패했습니다.");
            }
        }
    };

    return (
        <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
            {playing ? (
                <>
                    <span>⏸️</span> 정지
                </>
            ) : (
                <>
                    <span>▶️</span> 요약 듣기
                </>
            )}
        </button>
    );
}

