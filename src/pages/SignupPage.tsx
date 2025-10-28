import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import logo from "@/assets/logo/YagoVibeLogo.svg";

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [targetField, setTargetField] = useState<"email" | "password" | "confirm" | null>(null);
  const navigate = useNavigate();

  // 🔊 AI 음성 안내
  const speak = (text: string) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 1.5; // 최적 속도: 끊기지 않고 완전히 재생됨
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
  };

  // 📍 위치 정보 가져오기
  const getLocation = async (): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve("위치 정보 없음");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          resolve(`lat:${latitude.toFixed(4)}, lng:${longitude.toFixed(4)}`);
        },
        () => resolve("위치 정보 없음"),
        { timeout: 5000 }
      );
    });
  };

  // 🧩 Firebase 회원가입 + 프로필 생성
  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (!email || !password || !confirm) {
      speak("이메일, 비밀번호, 비밀번호 확인을 모두 입력해주세요.");
      setError("이메일, 비밀번호, 비밀번호 확인을 모두 입력해주세요.");
      return;
    }

    if (password !== confirm) {
      const errorMsg = "비밀번호가 일치하지 않습니다.";
      speak(errorMsg);
      setError(errorMsg);
      return;
    }

    if (password.length < 6) {
      const errorMsg = "비밀번호는 최소 6자 이상이어야 합니다.";
      speak(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      // 1. Firebase Auth로 회원가입
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. 위치 정보 가져오기
      const location = await getLocation();

      // 3. 기본 데이터 구성
      const nickname = `게스트_${Math.floor(Math.random() * 10000)}`;
      const favoriteSports = ["축구", "농구", "러닝"];
      const createdAt = new Date().toISOString();

      // 4. Firestore에 프로필 문서 생성
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email,
        nickname,
        favoriteSports,
        location,
        createdAt,
        aiProfile: true,
        updatedAt: createdAt,
      });

      speak("회원가입이 완료되었습니다. AI 프로필이 생성되었습니다.");
      navigate("/home");
    } catch (err: any) {
      console.error(err);
      let errorMsg = "회원가입 중 오류가 발생했습니다.";
      if (err.code === "auth/email-already-in-use") {
        errorMsg = "이미 등록된 이메일입니다.";
      } else if (err.code === "auth/weak-password") {
        errorMsg = "비밀번호가 너무 약합니다.";
      } else {
        errorMsg = "회원가입 중 오류가 발생했습니다. 이메일 형식과 비밀번호를 확인해주세요.";
      }
      speak(errorMsg);
      setError(errorMsg);
    }
  };

  // 🎙️ 음성 인식 시작/중단
  const startListening = () => {
    if (!recognition) return;
    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    if (!recognition) return;
    setListening(false);
    recognition.stop();
  };

  // 🎧 음성 명령 처리 로직
  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recog = new SpeechRecognitionClass() as SpeechRecognition;
    recog.lang = "ko-KR";
    recog.continuous = false;
    recog.interimResults = false;

    recog.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim();
      console.log("🎤 인식된 명령:", transcript);

      // 명령어 인식
      if (transcript.includes("이메일")) {
        speak("이메일 입력을 시작합니다. 말씀해주세요.");
        setTargetField("email");
        setTimeout(() => {
          recog.start();
        }, 100);
        return;
      } else if (transcript.includes("비밀번호 확인") || transcript.includes("비밀번호 재입력")) {
        speak("비밀번호 확인 입력을 시작합니다.");
        setTargetField("confirm");
        setTimeout(() => {
          recog.start();
        }, 100);
        return;
      } else if (transcript.includes("비밀번호")) {
        speak("비밀번호 입력을 시작합니다.");
        setTargetField("password");
        setTimeout(() => {
          recog.start();
        }, 100);
        return;
      } else if (transcript.includes("회원가입") || transcript.includes("가입")) {
        handleSignup();
        return;
      } else if (transcript.includes("홈으로")) {
        speak("홈 화면으로 이동합니다.");
        navigate("/start");
        return;
      }

      // 필드 입력 처리
      setTargetField((prevField) => {
        if (prevField === "email") {
          // "at" -> "@", "dot" -> "." 변환
          let processedText = transcript
            .replace(/\s+at\s+/gi, "@")
            .replace(/\s+dot\s+/gi, ".")
            .replace(/\s+/g, "");
          setEmail(processedText);
          speak(`이메일 ${processedText} 입력되었습니다.`);
          return null;
        } else if (prevField === "password") {
          setPassword(transcript.replace(/\s+/g, ""));
          speak("비밀번호가 입력되었습니다.");
          return null;
        } else if (prevField === "confirm") {
          setConfirm(transcript.replace(/\s+/g, ""));
          speak("비밀번호 확인이 입력되었습니다.");
          return null;
        } else {
          speak("명령을 인식하지 못했습니다. 다시 말씀해주세요.");
          return null;
        }
      });
    };

    recog.onend = () => {
      setListening(false);
      // targetField가 설정되어 있으면 계속 듣기
      if (targetField) {
        setTimeout(() => {
          recog.start();
        }, 100);
      }
    };

    (recog as any).onerror = (event: any) => {
      console.error("음성 인식 오류:", event.error);
      setListening(false);
      setTargetField(null);
    };

    setRecognition(recog);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <img
        src={logo}
        alt="YAGO VIBE"
        className="w-24 h-24 mb-6 drop-shadow-md"
      />
      <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
        회원가입
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        AI가 당신의 스포츠 여정을 함께합니다.
      </p>

      <form
        onSubmit={handleSignup}
        className="w-full max-w-xs flex flex-col gap-3"
      >
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm ${targetField === "email" ? "ring-2 ring-indigo-500" : ""
            }`}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm ${targetField === "password" ? "ring-2 ring-indigo-500" : ""
            }`}
        />
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm ${targetField === "confirm" ? "ring-2 ring-indigo-500" : ""
            }`}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md"
        >
          가입하기
        </button>
      </form>

      {/* 🎙️ 음성 명령 버튼 */}
      {recognition && (
        <button
          onClick={listening ? stopListening : startListening}
          className={`mt-8 px-6 py-3 rounded-full text-white text-sm font-semibold shadow-md transition-all ${listening ? "bg-red-500 animate-pulse" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
        >
          {listening ? "🎤 듣는 중..." : "🎙️ 음성 명령 시작"}
        </button>
      )}

      <div className="mt-5 text-sm text-gray-600">
        이미 계정이 있으신가요?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          로그인
        </Link>
      </div>

      <footer className="mt-10 text-xs text-gray-400">
        © 2025 YAGO VIBE · Powered by AI
      </footer>
    </div>
  );
}
