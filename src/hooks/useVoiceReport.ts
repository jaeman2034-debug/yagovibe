import { useState, useEffect } from "react";

export function useVoiceReport(report: string, onNext: () => void) {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const speak = () => {
    if (!report) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(report);
    utter.lang = "ko-KR";
    utter.rate = 1.0;
    utter.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          finalTranscript += transcript;
        }
      }
      setTranscript(finalTranscript);

      // 음성 명령 해석
      const lower = finalTranscript.toLowerCase();
      if (lower.includes("읽어줘") || lower.includes("읽어")) {
        speak();
        setTranscript("");
      } else if (lower.includes("멈춰") || lower.includes("중지")) {
        stop();
        setTranscript("");
      } else if (lower.includes("다음") || lower.includes("넘어가")) {
        onNext();
        setTranscript("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("음성 인식 오류:", event.error);
      setListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    if ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if ((window as any).currentRecognition) {
        (window as any).currentRecognition.stop();
      }
    }
    setListening(false);
  };

  return {
    speaking,
    listening,
    transcript,
    startListening,
    stopListening,
    speak,
    stop,
  };
}

