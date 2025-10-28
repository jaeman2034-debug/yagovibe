export const useSpeech = () => {
  const synth = window.speechSynthesis;
  const recognition = new (window.SpeechRecognition || (window as any).webkitSpeechRecognition)();
  recognition.lang = "ko-KR";

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.5; // 최적 속도 설정
    synth.speak(utterance);
  };

  const listen = () =>
    new Promise<string>((resolve) => {
      recognition.start();
      recognition.onresult = (e: any) => resolve(e.results[0][0].transcript);
    });

  return { speak, listen };
};
