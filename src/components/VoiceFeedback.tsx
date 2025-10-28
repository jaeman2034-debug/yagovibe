import { useEffect } from "react";

export function VoiceFeedback({ intent }: { intent: string }) {
    useEffect(() => {
        const msg: Record<string, string> = {
            지도_이동: "지도로 이동할게요.",
            현재위치: "현재 위치로 이동합니다.",
            근처_편의점: "근처 편의점을 보여드릴게요.",
            근처_축구장: "주변 축구장을 표시합니다.",
        };
        const t = msg[intent];
        if (t) {
            const u = new SpeechSynthesisUtterance(t);
            u.lang = "ko-KR";
            speechSynthesis.speak(u);
        }
    }, [intent]);

    return null;
}
