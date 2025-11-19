import { useEffect, useState } from "react";
import { handleVoiceCommand } from "@/services/VoiceAgentCore";
import { useNavigate } from "react-router-dom";

// 🎯 음성 명령 + AI 응답(TTS) 통합 훅
export function useSpeechCommand() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // ✅ 음성 출력(TTS)
  const speak = (text: string) => {
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.pitch = 1.1;
    utter.rate = 1.0;
    utter.volume = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("❌ 이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (e: any) => {
      const text = e.results[0][0].transcript.trim();
      setTranscript(text);
      setListening(false);
      console.log("🎤 인식된 음성:", text);

      // NLU + 라우터 처리
      const res = await handleVoiceCommand(navigate, text);
      console.log("🤖 AI 응답:", res);
      setMessage(res);

      // ✅ TTS로 말하기
      speak(res);
    };

    recognition.onerror = (e: any) => {
      console.error("🎤 음성 인식 오류:", e);
      setMessage("음성 인식 오류가 발생했습니다.");
      setListening(false);
    };

    if (listening) recognition.start();

    return () => recognition.stop();
  }, [listening, navigate]);

  return { listening, transcript, message, setListening };
}
