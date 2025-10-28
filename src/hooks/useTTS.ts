export function speak(text: string, lang = "ko-KR") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 1.5; // 최적 속도 설정
  try { window.speechSynthesis.cancel(); } catch {}
  window.speechSynthesis.speak(utter);
}
