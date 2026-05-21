import { useEffect, useState } from "react";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function VoiceAssistant_AI() {
  const [text, setText] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [listening, setListening] = useState(false);

  // ✅ 브라우저 음성 인식 객체
  const SpeechRecognition = typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

  // ✅ Firestore 실시간 분석 결과 구독
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "voice_analysis"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          console.log("🧠 AI 응답 수신:", data);
          setAiResult(data);
          speakText(data.aiResult?.summary || "AI 분석 결과를 불러왔어요.");
        }
      });
    });
    return () => unsub();
  }, []);

  // ✅ 음성 인식 시작
  const startListening = () => {
    if (!SpeechRecognition) {
      alert("음성 인식을 지원하지 않는 브라우저입니다 😢");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;

    setListening(true);

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      console.log("🎤 음성 인식 결과:", transcript);
      await sendVoiceCommand(transcript, "user_demo");
      setListening(false);
    };

    recognition.onerror = (e: any) => {
      console.error("❌ 음성 인식 오류:", e);
      setListening(false);
    };

    recognition.start();
  };

  // ✅ Firestore로 음성 명령 전송
  const sendVoiceCommand = async (text: string, userId: string) => {
    const ref = await addDoc(collection(db, "voice_commands"), {
      text,
      userId,
      createdAt: new Date(),
    });
    console.log("✅ Firestore 전송 완료:", ref.id);
  };

  // ✅ TTS로 음성 재생
  const speakText = (text: string) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">🎙️ YAGO SPORTS Voice Assistant</h1>

      <button
        onClick={startListening}
        className={`px-6 py-3 rounded-2xl font-semibold shadow-md transition ${listening ? "bg-red-500 animate-pulse" : "bg-blue-600 hover:bg-blue-700"
          }`}
      >
        {listening ? "🎧 듣는 중..." : "🎤 말하기 시작"}
      </button>

      {text && (
        <div className="mt-6 p-4 bg-gray-800 rounded-xl w-full max-w-none md:max-w-3xl">
          <p className="text-gray-300 text-sm mb-2">음성 인식 결과</p>
          <p className="text-lg">{text}</p>
        </div>
      )}

      {aiResult && (
        <div className="mt-6 p-6 bg-green-800 rounded-2xl shadow-lg w-full max-w-none md:max-w-3xl transition-all">
          <h2 className="text-xl font-semibold mb-2">🧠 AI 분석 결과</h2>
          <p className="text-gray-100">{aiResult.aiResult?.summary || "분석 중..."}</p>
          <p className="text-sm text-gray-400 mt-3">
            ⏱ {new Date(aiResult.createdAt?.seconds * 1000).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
