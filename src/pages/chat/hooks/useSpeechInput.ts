// 🔥 간단한 음성 입력 훅 (Web Speech API, 유지보수 천재 패턴)
import { useState, useRef } from "react";

export function useSpeechInput(onResult: (text: string) => void) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

    const supported = !!SpeechRecognition;

    const start = () => {
        if (!supported) {
            console.warn("⚠️ Web Speech API가 지원되지 않는 브라우저입니다.");
            return;
        }

        // 이미 실행 중이면 중지
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // 무시
            }
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "ko-KR";
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => {
            setIsListening(true);
            console.log("🎤 음성 입력 시작");
        };

        recognition.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript.trim();
            console.log("📝 음성 입력 결과:", transcript);
            onResult(transcript);
        };

        recognition.onerror = (e: any) => {
            console.error("❌ 음성 입력 오류:", e.error);
            setIsListening(false);
            // 🔥 실패해도 UX 안 깨짐 (조용한 실패)
        };

        recognition.onend = () => {
            setIsListening(false);
            console.log("🎤 음성 입력 종료");
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (e: any) {
            if (e.message?.includes("already started")) {
                // 이미 실행 중이면 무시
                return;
            }
            console.error("❌ 음성 입력 시작 실패:", e);
        }
    };

    return {
        supported,
        isListening,
        start,
    };
}

