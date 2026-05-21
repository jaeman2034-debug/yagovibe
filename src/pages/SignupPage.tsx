import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { upgradeGuestAccount } from "@/utils/upgradeGuestAccount";
import { signInWithGoogleAdaptive } from "@/utils/authHelpers";
import Logo from "@/components/common/Logo";

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
  const [googleLoading, setGoogleLoading] = useState(false);
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
      let user;
      
      // 게스트 계정이면 승격, 아니면 새로 생성
      if (auth.currentUser?.isAnonymous) {
        console.log("🎯 게스트 계정 발견 → 정식 계정으로 승격 시도");
        user = await upgradeGuestAccount(email, password);
        speak("게스트 계정이 정식 계정으로 승격되었습니다.");
        
        // 승격된 계정은 이미 존재하므로 Firestore 업데이트만 수행
        const location = await getLocation();
        await setDoc(doc(db, "users", user!.uid), {
          uid: user!.uid,
          email,
          location,
          aiProfile: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true }); // merge: true로 기존 데이터 유지
        
      } else {
        // 1. Firebase Auth로 새 회원가입
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;

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
      }

      // /hub 이동은 PublicRoute(sessionUser)가 처리
    } catch (err: any) {
      console.error(err);
      let errorMsg = "회원가입 중 오류가 발생했습니다.";
      if (err.code === "auth/email-already-in-use") {
        errorMsg = "이미 등록된 이메일입니다.";
      } else if (err.code === "auth/weak-password") {
        errorMsg = "비밀번호가 너무 약합니다.";
      } else {
        errorMsg = err.message || "회원가입 중 오류가 발생했습니다. 이메일 형식과 비밀번호를 확인해주세요.";
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
          const processedText = transcript
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
    <div className="flex flex-col items-center text-center">
      <Logo size={96} alt="YAGO SPORTS" className="mb-6 drop-shadow-md" />
      <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
        회원가입
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        AI가 당신의 스포츠 여정을 함께합니다.
      </p>

      <form
        onSubmit={handleSignup}
        className="flex w-full max-w-none flex-col items-center gap-3 sm:max-w-md"
      >
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={`w-full sm:w-auto min-w-[280px] max-w-[400px] px-4 py-3 border border-gray-200 rounded-full text-center text-sm focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50 focus:border-blue-500 focus:outline-none shadow-sm transition-all duration-300 ${targetField === "email" ? "ring-4 ring-indigo-400 ring-opacity-50 border-indigo-500" : ""
            }`}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className={`w-full sm:w-auto min-w-[280px] max-w-[400px] px-4 py-3 border border-gray-200 rounded-full text-center text-sm focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50 focus:border-blue-500 focus:outline-none shadow-sm transition-all duration-300 ${targetField === "password" ? "ring-4 ring-indigo-400 ring-opacity-50 border-indigo-500" : ""
            }`}
        />
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          className={`w-full sm:w-auto min-w-[280px] max-w-[400px] px-4 py-3 border border-gray-200 rounded-full text-center text-sm focus:ring-4 focus:ring-blue-400 focus:ring-opacity-50 focus:border-blue-500 focus:outline-none shadow-sm transition-all duration-300 ${targetField === "confirm" ? "ring-4 ring-indigo-400 ring-opacity-50 border-indigo-500" : ""
            }`}
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          type="submit"
          className="w-full sm:w-auto min-w-[280px] max-w-[400px] bg-blue-600 text-white py-3 rounded-full text-sm font-semibold hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          가입하기
        </button>
      </form>

      {/* 🔥 소셜 로그인 버튼 */}
      <div className="mt-4 w-full max-w-xs">
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">또는</span>
          </div>
        </div>
        
        <button
          onClick={async () => {
            if (googleLoading) {
              console.log("⚠️ [Google Signup] 이미 진행 중...");
              return;
            }
            setGoogleLoading(true);
            setError("");

            try {
              const provider = new GoogleAuthProvider();
              provider.setCustomParameters({ prompt: "select_account" });
              await signInWithGoogleAdaptive(auth, provider);
            } catch (error: any) {
              console.error("❌ [Google Signup] Google 가입/로그인 실패:", error);
              if (
                error.code === "auth/requests-from-referer-are-blocked" ||
                error.message?.includes("requests-from-referer")
              ) {
                const msg =
                  "인증 요청이 차단되었습니다. Firebase Console → 승인된 도메인에\n" +
                  window.location.hostname +
                  "\n을(를) 추가해 주세요.";
                alert(msg);
                setError(msg);
              } else if (error.code === "auth/operation-not-allowed") {
                const m =
                  "Google 로그인이 비활성화되어 있습니다. Firebase Console에서 활성화해 주세요.";
                alert(m);
                setError(m);
              } else {
                setError(error.message || "구글 회원가입을 시작할 수 없습니다.");
              }
            } finally {
              setGoogleLoading(false);
            }
          }}
          disabled={googleLoading}
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all shadow-sm ${googleLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? "회원가입 중..." : "구글로 회원가입"}
        </button>
      </div>

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
        © 2025 YAGO SPORTS · Powered by AI
      </footer>
    </div>
  );
}
