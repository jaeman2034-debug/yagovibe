import { useNavigate } from "react-router-dom";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import logo from "@/assets/logo/YagoVibeLogo.svg";

interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
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

export default function StartScreen() {
    const navigate = useNavigate();
    const [listening, setListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [isGuestLoading, setIsGuestLoading] = useState(false);

    // 🔊 AI 음성 출력
    const speak = (text: string) => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "ko-KR";
        utter.rate = 1.5; // 최적 속도: 끊기지 않고 완전히 재생됨
        utter.pitch = 1.0;
        window.speechSynthesis.speak(utter);
    };

    // 🎯 게스트 로그인
    const handleGuestLogin = async () => {
        console.log("👀 게스트 모드 진입 시도...");

        if (isGuestLoading) {
            console.log("⚠️ 이미 처리 중입니다...");
            return;
        }

        setIsGuestLoading(true);

        try {
            console.log("🔐 Firebase 익명 로그인 시도 중...");

            // Firebase Auth 인스턴스 직접 가져오기
            const authInstance = auth;
            console.log("📋 Auth 인스턴스:", authInstance ? "✅ 로드됨" : "❌ 없음");

            const userCredential = await signInAnonymously(authInstance);

            if (userCredential?.user) {
                console.log("✅ 게스트 로그인 성공!", userCredential.user.uid);

                // 음성 안내
                speak("게스트 모드로 접속하셨습니다. 일부 기능은 제한됩니다.");

                // 페이지 이동 - window.location을 사용하여 확실하게 이동
                setTimeout(() => {
                    console.log("🏠 /home 페이지로 이동...");
                    window.location.href = "/home";
                }, 800); // 음성 출력 시간 확보
            } else {
                throw new Error("사용자 정보를 가져올 수 없습니다.");
            }
        } catch (error: any) {
            console.error("❌ 게스트 로그인 실패:", error);
            console.error("오류 상세:", {
                code: error?.code,
                message: error?.message,
                stack: error?.stack,
            });

            speak("게스트 로그인 중 오류가 발생했습니다. 다시 시도해주세요.");

            // 사용자 친화적인 오류 메시지
            let errorMessage = "게스트 로그인에 실패했습니다.";
            if (error?.code === "auth/api-key-not-valid") {
                errorMessage = "Firebase 설정 오류: API 키를 확인해주세요.";
            } else if (error?.code === "auth/operation-not-allowed") {
                errorMessage = "익명 로그인이 활성화되지 않았습니다. Firebase Console에서 확인해주세요.";
            } else if (error?.message) {
                errorMessage = error.message;
            }

            alert(`❌ ${errorMessage}\n\n콘솔을 확인하여 상세 정보를 확인하세요.`);
            setIsGuestLoading(false);
        }
    };

    // 🧠 음성 명령 인식 (STT)
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
            console.log("🎤 음성 인식 결과:", transcript);

            if (transcript.includes("로그인")) {
                speak("로그인 페이지로 이동합니다.");
                navigate("/login");
            } else if (transcript.includes("회원가입")) {
                speak("회원가입 페이지로 이동합니다.");
                navigate("/signup");
            } else if (transcript.includes("게스트") || transcript.includes("둘러보기")) {
                handleGuestLogin();
            } else {
                speak("명령을 인식하지 못했습니다. 다시 말씀해주세요.");
            }
        };

        recog.onend = () => setListening(false);
        setRecognition(recog);
    }, [navigate]);

    return (
        <div
            className="fixed inset-0 bg-white"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100vh',
                margin: 0,
                padding: 0,
            }}
        >
            {/* 메인 컨텐츠 컨테이너 - 완벽한 중앙 정렬 */}
            <div
                className="flex flex-col items-center text-center w-full max-w-md px-6"
                style={{
                    textAlign: 'center',
                    margin: '0 auto',
                }}
            >
                <img src={logo} alt="YAGO VIBE Logo" className="w-24 h-24 mb-8" />

                <h1 className="text-4xl font-extrabold text-gray-900 mb-1">YAGO VIBE</h1>
                <p className="text-sm text-gray-500 mb-8">
                    AI Platform for Sports & Community
                </p>

                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                    스포츠의 연결, 야고바이브
                </h2>
                <p className="text-gray-500 mb-10 text-[15px] leading-relaxed">
                    AI가 당신의 스포츠 활동을 분석하고,<br />
                    커뮤니티와 장비, 모임을 하나로 연결합니다.
                </p>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={() => navigate("/login")}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md"
                    >
                        로그인
                    </button>
                    <button
                        onClick={() => navigate("/signup")}
                        className="w-full py-3 border border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition shadow-md"
                    >
                        회원가입
                    </button>
                    <button
                        onClick={handleGuestLogin}
                        disabled={isGuestLoading}
                        className={`w-full bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${isGuestLoading
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-200"
                            }`}
                    >
                        {isGuestLoading ? (
                            <>
                                <span className="inline-block animate-spin mr-2">⏳</span>
                                접속 중...
                            </>
                        ) : (
                            "게스트로 둘러보기 →"
                        )}
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

                {/* Footer - 상단과 하단 마진 동일하게 */}
                <footer className="mt-10 text-gray-400 text-xs text-center">
                    © 2025 YAGO VIBE · Powered by AI
                </footer>
            </div>
        </div>
    );
}
