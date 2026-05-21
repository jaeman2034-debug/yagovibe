/**
 * 🔥 전역 TTS 매니저 (한 번에 하나만 재생)
 * 
 * 배포 안정화:
 * - 여러 메시지 동시 재생 방지
 * - 메모리 누수 방지
 * - 자동 정리
 */

let globalSynth: SpeechSynthesis | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeaking = false;

export function getGlobalTTS(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  if (!globalSynth) {
    globalSynth = window.speechSynthesis;
  }
  return globalSynth;
}

export function speakGlobal(text: string, options?: {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}): void {
  const synth = getGlobalTTS();
  if (!synth) {
    console.warn("⚠️ TTS가 지원되지 않는 브라우저입니다.");
    return;
  }

  // 🔥 기존 재생 즉시 중지 (중복 재생 방지)
  if (isSpeaking && currentUtterance) {
    synth.cancel();
    currentUtterance = null;
    isSpeaking = false;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options?.lang || "ko-KR";
  utterance.rate = options?.rate ?? 1;
  utterance.pitch = options?.pitch ?? 1;
  utterance.volume = options?.volume ?? 1;

  utterance.onstart = () => {
    isSpeaking = true;
    currentUtterance = utterance;
    console.log("🔊 [TTS Manager] 읽기 시작:", text.substring(0, 20));
  };

  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    console.log("🔊 [TTS Manager] 읽기 완료");
  };

  utterance.onerror = () => {
    isSpeaking = false;
    currentUtterance = null;
    console.error("❌ [TTS Manager] 읽기 오류");
  };

  currentUtterance = utterance;
  synth.speak(utterance);
}

export function stopGlobalTTS(): void {
  const synth = getGlobalTTS();
  if (synth && isSpeaking) {
    synth.cancel();
    isSpeaking = false;
    currentUtterance = null;
    console.log("🔊 [TTS Manager] 중지");
  }
}

export function isGlobalTTSSpeaking(): boolean {
  return isSpeaking;
}
