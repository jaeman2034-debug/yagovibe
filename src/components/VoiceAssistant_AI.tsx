import { useRef, useState } from "react";
import { STTService } from "../services/STTService";
import { handleVoiceCommand } from "../services/VoiceAgentCore";

/**
 * 🎤 AI 음성 어시스턴트 - 통합 루프
 * STT → NLU → Action → TTS → Log 자동화
 */
export default function VoiceAssistant_AI() {
  const [isListening, setIsListening] = useState(false);
  const sttRef = useRef<STTService | null>(null);

  const startListening = () => {
    setIsListening(true);

    sttRef.current = new STTService({
      onResult: async (text) => {
        console.log("🎤 인식 결과:", text);
        setIsListening(false);
        await handleVoiceCommand(text);
      },
      onError: (err) => {
        console.error("❌ STT 오류:", err);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    sttRef.current.start();
  };

  return (
    <button
      onClick={startListening}
      disabled={isListening}
      className={`fixed bottom-6 right-6 rounded-full p-4 shadow-lg transition-all ${isListening
          ? "bg-red-500 animate-pulse text-white"
          : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
    >
      {isListening ? "🎧 듣는 중..." : "🎤 음성 실행"}
    </button>
  );
}
