// TTSService.ts
export class TTSService {
  speak(text: string) {
    if (!("speechSynthesis" in window)) {
      console.warn("SpeechSynthesis 미지원");
      return;
    }
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = "ko-KR";
    uttr.rate = 1;
    uttr.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(uttr);
  }
  cancel() {
    window.speechSynthesis?.cancel();
  }
}

// speakText 함수 (호환성)
export function speakText(text: string) {
  return speak(text);
}

// 글로벌 TTS 함수
export function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 1.0;
    synth.cancel();
    synth.speak(utter);
  } catch { }
}
