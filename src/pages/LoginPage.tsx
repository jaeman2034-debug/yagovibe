import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { upgradeGuestAccount } from "@/utils/upgradeGuestAccount";
import { ensureDurableAuthPersistence, isRealInAppBrowser, signInWithGoogleAdaptive } from "@/utils/authHelpers";
import { openExternalBrowser } from "@/utils/openExternalBrowser";
import Logo from "@/components/common/Logo";

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

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [, setListening] = useState(false);
    const [, setRecognition] = useState<SpeechRecognition | null>(null);
    const [targetField, setTargetField] = useState<"email" | "password" | null>(null);
    const targetFieldRef = useRef<"email" | "password" | null>(null);
    // 🔥 React StrictMode 이중 렌더링 방지용 ref
    const isSigningInRef = useRef(false);

    /** 카카오·인스타·FB 인앱 — 안내 배너만, 구글 버튼은 항상 표시 */
    const inAppStrict = isRealInAppBrowser();

    /**
     * P1 (E2 HOLD): 카카오 인앱에서 동일 URL 자동 리로드(bounce) 금지.
     * Android: Intent 1회만 시도(실패 시 페이지 유지). iOS: 자동 이동 없음 — CTA 사용.
     * 「Chrome·Safari에서 열기」버튼으로 보완.
     */
    useEffect(() => {
        if (typeof window === "undefined") return;
        const ua = navigator.userAgent;
        const isKakao = /KAKAOTALK/i.test(ua);
        const isAndroid = /Android/i.test(ua);

        try {
            if (sessionStorage.getItem("kakao_redirected")) return;
        } catch {
            return;
        }

        if (!isKakao) return;

        try {
            sessionStorage.setItem("kakao_redirected", "1");
        } catch {
            /* 비공개 모드 등 */
        }

        if (!isAndroid) {
            if (import.meta.env.DEV) {
                console.log("[Kakao] iOS 인앱 — 자동 리로드 생략, CTA 대기");
            }
            return;
        }

        if (import.meta.env.DEV) {
            console.log("[Kakao] Android 인앱 — Chrome Intent 1회 (no same-URL bounce)");
        }
        openExternalBrowser(window.location.href, { fallbackDelay: 1200 });
    }, []);
    useEffect(() => {
        targetFieldRef.current = targetField;
    }, [targetField]);

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        console.log("[LoginPage] Google CTA", { inAppStrict });
    }, [inAppStrict]);

    // redirect·세션 복구는 AuthProvider + PublicRoute만 사용 (여기서 /hub navigate 금지)

    const handleGoogleLogin = useCallback(async () => {
        if (import.meta.env.DEV) {
            console.log("[Google Login] click", {
                googleLoading,
                isSigningIn: isSigningInRef.current,
            });
        }
        if (googleLoading || isSigningInRef.current) {
            if (import.meta.env.DEV) {
                console.warn("[Google Login] skip (already in progress)");
            }
            return;
        }
        isSigningInRef.current = true;
        setGoogleLoading(true);
        setError("");

        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            const outcome = await signInWithGoogleAdaptive(auth, provider);
            if (import.meta.env.DEV) {
                console.log("[Google Login] done", {
                    mode: outcome.mode,
                    uid: auth.currentUser?.uid ?? null,
                });
            }
            isSigningInRef.current = false;
            setGoogleLoading(false);
        } catch (error: any) {
            console.error("[Google Login] 실패", {
                code: error?.code,
                message: error?.message,
            });
            isSigningInRef.current = false;
            setGoogleLoading(false);

            if (
                error.code === "auth/requests-from-referer-are-blocked" ||
                error.message?.includes("requests-from-referer")
            ) {
                const msg =
                    "인증 요청이 차단되었습니다. Firebase Console → Authentication → 승인된 도메인에\n" +
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
                setError(error.message || "구글 로그인을 시작할 수 없습니다.");
            }
        }
    }, [googleLoading]);

    // 🔊 TTS 안내 함수
    const speak = (text: string) => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "ko-KR";
        utter.rate = 1.5; // 최적 속도: 끊기지 않고 완전히 재생됨
        utter.pitch = 1.0;
        window.speechSynthesis.speak(utter);
    };

    // 🔥 비밀번호 재설정 이메일 전송
    const handlePasswordReset = async () => {
        if (!email) {
            const errorMsg = "이메일을 먼저 입력해주세요.";
            speak(errorMsg);
            setError(errorMsg);
            return;
        }

        setResetLoading(true);
        setError("");
        setResetSuccess(false);

        try {
            await sendPasswordResetEmail(auth, email);
            const successMsg = "비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.";
            speak(successMsg);
            setResetSuccess(true);
            console.log("✅ 비밀번호 재설정 이메일 전송 성공:", email);
        } catch (error: any) {
            console.error("❌ 비밀번호 재설정 이메일 전송 실패:", error);
            let errorMsg = "";

            if (error.code === "auth/user-not-found") {
                errorMsg = "등록되지 않은 이메일입니다.";
            } else if (error.code === "auth/invalid-email") {
                errorMsg = "유효하지 않은 이메일 형식입니다.";
            } else if (error.code === "auth/too-many-requests") {
                errorMsg = "너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.";
            } else {
                errorMsg = error.message || "비밀번호 재설정 이메일 전송에 실패했습니다.";
            }

            speak(errorMsg);
            setError(errorMsg);
        } finally {
            setResetLoading(false);
        }
    };

    // 🎯 로그인 처리
    const handleLogin = async (e?: FormEvent) => {
        if (e) e.preventDefault();
        setError("");
        if (!email || !password) {
            speak("이메일과 비밀번호를 모두 입력해주세요.");
            setError("이메일과 비밀번호를 모두 입력해주세요.");
            return;
        }
        try {
            await ensureDurableAuthPersistence(auth);
            // 게스트 계정이면 승격 시도
            if (auth.currentUser?.isAnonymous) {
                console.log("🎯 게스트 계정 발견 → 정식 계정으로 승격 시도");
                await upgradeGuestAccount(email, password);
                speak("게스트 계정이 정식 계정으로 승격되었습니다.");
            } else {
                // 일반 로그인
                await signInWithEmailAndPassword(auth, email, password);
                speak("로그인에 성공했습니다. 홈 화면으로 이동합니다.");
            }
            // /hub 이동은 PublicRoute(sessionUser)가 처리
        } catch (error: any) {
            console.error("❌ 로그인 오류:", error);
            
            // 🔥 Firebase 오류 메시지 한글화 및 해결 방법 안내
            let errorMsg = "";
            if (error.code === "auth/operation-not-allowed") {
                errorMsg = "이메일/비밀번호 로그인이 활성화되지 않았습니다.\n\nFirebase Console에서 활성화해주세요:\n1. Firebase Console > Authentication > Sign-in method\n2. Email/Password 활성화\n3. Google 로그인도 활성화";
                alert(errorMsg);
            } else if (error.code === "auth/user-not-found") {
                errorMsg = "등록되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.";
            } else if (error.code === "auth/wrong-password") {
                errorMsg = "비밀번호가 올바르지 않습니다.";
            } else if (error.code === "auth/invalid-email") {
                errorMsg = "유효하지 않은 이메일 형식입니다.";
            } else if (error.code === "auth/too-many-requests") {
                errorMsg = "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.";
            } else if (error.code === "auth/network-request-failed") {
                errorMsg = "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
            } else {
                errorMsg = error.message || "로그인에 실패했습니다. 이메일이나 비밀번호를 확인해주세요.";
            }
            
            speak(errorMsg);
            setError(errorMsg);
        }
    };

    // 🧠 음성 인식 로직 (UI 버튼 제거됨 — 초기화는 유지)
    useEffect(() => {
        let recog: SpeechRecognition | null = null;
        try {
            const SpeechRecognitionClass =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (!SpeechRecognitionClass) {
                console.warn("이 브라우저는 음성 인식을 지원하지 않습니다.");
                return;
            }

            recog = new SpeechRecognitionClass() as SpeechRecognition;
            recog.lang = "ko-KR";
            recog.continuous = false;
            recog.interimResults = false;

            recog.onresult = (event: SpeechRecognitionEvent) => {
                try {
                    const first = event.results[0]?.[0];
                    const transcript = first?.transcript?.trim() ?? "";
                    if (!transcript) return;

                    console.log("🎤 음성 인식 결과:", transcript);

                    if (transcript.includes("이메일")) {
                        speak("이메일 입력을 시작합니다. 말씀해주세요.");
                        setTargetField("email");
                        setTimeout(() => {
                            try {
                                recog?.start();
                            } catch {
                                /* ignore */
                            }
                        }, 100);
                        return;
                    }
                    if (transcript.includes("비밀번호")) {
                        speak("비밀번호 입력을 시작합니다.");
                        setTargetField("password");
                        setTimeout(() => {
                            try {
                                recog?.start();
                            } catch {
                                /* ignore */
                            }
                        }, 100);
                        return;
                    }
                    if (transcript.includes("로그인")) {
                        void handleLogin();
                        return;
                    }

                    setTargetField((prevField) => {
                        if (prevField === "email") {
                            const processedText = transcript
                                .replace(/\s+at\s+/gi, "@")
                                .replace(/\s+dot\s+/gi, ".")
                                .replace(/\s+/g, "");
                            setEmail(processedText);
                            speak(`이메일 ${processedText} 입력되었습니다.`);
                            return null;
                        }
                        if (prevField === "password") {
                            setPassword(transcript.replace(/\s+/g, ""));
                            speak("비밀번호가 입력되었습니다.");
                            return null;
                        }
                        speak("명령을 인식하지 못했습니다. 다시 말씀해주세요.");
                        return null;
                    });
                } catch (err) {
                    console.error("음성 인식 결과 처리 오류:", err);
                }
            };

            recog.onend = () => {
                setListening(false);
                if (targetFieldRef.current) {
                    setTimeout(() => {
                        try {
                            recog?.start();
                        } catch {
                            /* ignore */
                        }
                    }, 100);
                }
            };

            (recog as any).onerror = (event: any) => {
                console.error("음성 인식 오류:", event.error);
                setListening(false);
                setTargetField(null);
            };

            setRecognition(recog);
        } catch (error) {
            console.error("음성 인식 초기화 오류:", error);
        }

        return () => {
            if (!recog) return;
            try {
                recog.onresult = null;
                recog.onend = null;
                (recog as any).onerror = null;
                if (typeof (recog as any).abort === "function") {
                    (recog as any).abort();
                } else {
                    recog.stop();
                }
            } catch {
                /* ignore */
            }
        };
    }, []);

    const inputClass =
        "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgb(255,255,255)] [&:-webkit-autofill]:[-webkit-text-fill-color:#111827]";

    return (
        <div className="flex min-h-dvh flex-col items-center bg-gray-50 px-4 pb-16 pt-8 sm:pb-12 sm:pt-10">
            <div className="flex w-full max-w-sm flex-col items-center text-center">
                <Logo
                    size={128}
                    alt="YAGO SPORTS"
                    className="mx-auto mb-4"
                />
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    YAGO SPORTS
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    AI Platform for Sports Enthusiasts
                </p>

                <div className="mt-6 flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 text-left">
                {/* 인앱: 자동 크롬 유도(useEffect) + 수동 열기. 구글 버튼은 항상 노출(자동 실패·직접 시도) */}
                {inAppStrict ? (
                    <div className="flex flex-col gap-2">
                        <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-center text-xs leading-relaxed text-amber-900">
                            {/KAKAOTALK/i.test(
                                typeof navigator !== "undefined" ? navigator.userAgent : ""
                            ) ? (
                                <>
                                    카카오톡 인앱에서는 로그인 유지가 <strong>불안정</strong>할 수 있습니다.
                                    알림톡·리포트는 <strong>Safari에서 열기</strong>를 권장합니다.
                                </>
                            ) : (
                                <>
                                    인앱 브라우저에서는 구글 로그인이 <strong>불안정하거나 차단</strong>될 수 있습니다.
                                    가능하면 <strong>Chrome·Safari</strong>에서 여세요.
                                </>
                            )}
                        </p>
                        <button
                            type="button"
                            onClick={() => openExternalBrowser(window.location.href)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800"
                        >
                            {/KAKAOTALK/i.test(
                                typeof navigator !== "undefined" ? navigator.userAgent : ""
                            )
                                ? "Safari에서 열기"
                                : "Chrome·Safari에서 열기"}
                        </button>
                        <p className="text-center text-[11px] text-gray-500">
                            문제가 있으면 아래 <strong>이메일</strong>·
                            <Link to="/login/phone" className="font-semibold text-blue-600 underline">
                                전화번호 로그인
                            </Link>
                        </p>
                    </div>
                ) : null}
                <button
                    type="button"
                    data-yago-google-login="1"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="relative z-20 flex w-full touch-manipulation items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {googleLoading ? "로그인 중..." : "G 구글로 로그인하기"}
                </button>

            <form
                onSubmit={handleLogin}
                className="mt-4 flex flex-col gap-3"
            >
                <input
                    type="email"
                    placeholder="이메일"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`${inputClass} ${targetField === "email" ? "ring-2 ring-indigo-500" : ""}`}
                />
                <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`${inputClass} ${targetField === "password" ? "ring-2 ring-indigo-500" : ""}`}
                />
                {error && !resetSuccess && <p className="text-red-500 text-sm">{error}</p>}
                {resetSuccess && (
                    <p className="text-green-600 text-sm bg-green-50 px-4 py-2 rounded-lg">
                        ✅ 비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.
                    </p>
                )}
                <button
                    type="submit"
                    className="mt-1 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700"
                >
                    로그인
                </button>
            </form>

                <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetLoading || !email}
                    className="mt-5 w-full text-center text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                >
                    {resetLoading ? "전송 중..." : "비밀번호를 잊으셨나요?"}
                </button>

                <Link
                    to="/login/phone"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                    전화번호로 로그인
                </Link>
                </div>

                <div className="mt-6 text-sm text-gray-600">
                    <Link to="/signup" className="text-blue-600 hover:underline">
                        회원가입
                    </Link>
                    {" · "}
                    <Link to="/start" className="hover:underline">
                        홈으로
                    </Link>
                </div>

                <footer className="mt-8 text-center text-[11px] leading-relaxed text-gray-400 sm:mt-10 sm:text-xs">
                    © 2025 YAGO SPORTS · Powered by AI
                </footer>
            </div>
        </div>
    );
}
