import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, sendPasswordResetEmail, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { upgradeGuestAccount } from "@/utils/upgradeGuestAccount";
import loginWordmark from "@/assets/logo/YagoSportsWordmark.svg";

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
    const navigate = useNavigate();
    
    // 🔥 React StrictMode 이중 렌더링 방지용 ref
    const isSigningInRef = useRef(false);
    
    // 🔥 모바일/웹뷰 환경에서는 무조건 Redirect 사용 (팝업 차단 방지)
    // 데스크톱만 Popup 사용, 나머지는 전부 Redirect
    const canUsePopup = (): boolean => {
        const ua = navigator.userAgent.toLowerCase();
        
        // 모바일/웹뷰 감지 (Android, iOS, WebView 등)
        if (/android|iphone|ipad|ipod|mobile|wv|webview/i.test(ua)) {
            console.log("📱 [Google Login] 모바일/웹뷰 환경 감지 - Redirect 방식 사용");
            return false;
        }
        
        // 작은 화면 감지 (모바일 기기)
        if (window.innerWidth < 768) {
            console.log("📱 [Google Login] 작은 화면 감지 - Redirect 방식 사용");
            return false;
        }
        
        // 데스크톱 환경만 Popup 사용
        console.log("💻 [Google Login] 데스크톱 환경 - Popup 방식 사용");
        return true;
    };

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
    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError("");
        if (!email || !password) {
            speak("이메일과 비밀번호를 모두 입력해주세요.");
            setError("이메일과 비밀번호를 모두 입력해주세요.");
            return;
        }
        try {
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
            navigate("/sports-hub");
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
        try {
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

            // 명령어 인식
            if (transcript.includes("이메일")) {
                speak("이메일 입력을 시작합니다. 말씀해주세요.");
                setTargetField("email");
                // 이메일 입력 모드에서 다음 음성을 기다리기 위해 다시 시작
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
            } else if (transcript.includes("로그인")) {
                handleLogin();
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
        } catch (error) {
            console.error("음성 인식 초기화 오류:", error);
            // 오류가 발생해도 로그인 페이지는 정상 작동하도록 함
        }
    }, []);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10">
            <div className="flex w-full max-w-sm flex-col items-center text-center">
                <img
                    src={loginWordmark}
                    alt="YAGO"
                    className="mx-auto mb-4 h-16 w-auto max-w-[200px] object-contain"
                />
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    YAGO SPORTS
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    AI Platform for Sports Enthusiasts
                </p>

                <div className="mt-6 w-full space-y-4 rounded-xl bg-white p-5 text-left shadow-md">
                <button
                    type="button"
                    onClick={async () => {
                        // 🔥 이중 방지: state + ref (React StrictMode 대응)
                        if (googleLoading || isSigningInRef.current) {
                            console.log("⚠️ [Google Login] 이미 로그인 진행 중... (중복 호출 차단)");
                            return;
                        }
                        
                        // 🔥 즉시 ref 설정 (동기적 - React StrictMode 이중 렌더링 방지)
                        isSigningInRef.current = true;
                        setGoogleLoading(true);
                        setError("");
                        
                        console.log("✅ [Google Login] 로그인 시작 - 중복 방지 활성화");
                        
                        try {
                            // 🔍 1. 사전 검증: 현재 환경 정보 로깅
                            const currentUrl = window.location.href;
                            const referer = document.referrer || currentUrl;
                            const hostname = window.location.hostname;
                            
                            console.log("🔍 [Google Login] 사전 검증 시작:", {
                                currentUrl,
                                referer,
                                hostname,
                                authDomain: auth.app.options.authDomain,
                                projectId: auth.app.options.projectId,
                                apiKey: auth.app.options.apiKey ? `${auth.app.options.apiKey.substring(0, 10)}...` : "없음",
                                timestamp: new Date().toISOString(),
                            });
                            
                            // 🔍 2. Firebase Auth 인스턴스 정보 확인
                            console.log("🔍 [Google Login] Firebase Auth 인스턴스 정보:", {
                                appName: auth.app.name,
                                authDomain: auth.app.options.authDomain,
                                projectId: auth.app.options.projectId,
                                apiKey: auth.app.options.apiKey ? "✅ 설정됨" : "❌ 없음",
                            });
                            
                            // 🔍 3. GoogleAuthProvider 생성 및 로깅
                            const provider = new GoogleAuthProvider();
                            // 🔥 Provider에 명시적 설정 추가 (referer 문제 해결)
                            provider.setCustomParameters({
                                prompt: 'select_account'
                            });
                            console.log("🔍 [Google Login] GoogleAuthProvider 생성 완료:", {
                                providerId: provider.providerId,
                            });
                            
                            // 🔍 4. signInWithPopup 호출 전 최종 확인
                            console.log("🔍 [Google Login] signInWithPopup 호출 직전:", {
                                authInstance: auth ? "✅ 존재" : "❌ 없음",
                                provider: provider ? "✅ 존재" : "❌ 없음",
                                currentDomain: hostname,
                                expectedAuthDomain: auth.app.options.authDomain,
                                domainMatch: hostname === auth.app.options.authDomain || 
                                            hostname.includes(auth.app.options.authDomain?.replace('.firebaseapp.com', '') || ''),
                            });
                            
                            // 🔥 5. 실제 로그인 시도
                            // ⚠️ 중복 호출 최종 확인 (마지막 방어선)
                            if (!isSigningInRef.current) {
                                console.error("❌ [Google Login] 중복 방지 실패 - ref가 false입니다!");
                            }
                            
                            // 🔥 모바일 환경 감지 및 적절한 로그인 방식 선택
                            const usePopup = canUsePopup();
                            
                            if (usePopup) {
                                // 💻 데스크톱 환경: Popup 방식 사용
                                console.log("🔥 [Google Login] signInWithPopup 호출 시작:", {
                                    timestamp: new Date().toISOString(),
                                    refValue: isSigningInRef.current,
                                    loadingState: googleLoading
                                });
                                
                                try {
                                    const result = await signInWithPopup(auth, provider);
                                    
                                    console.log("✅ [Google Login] Google 로그인 성공:", {
                                        userEmail: result.user.email,
                                        userUid: result.user.uid,
                                    });
                                    
                                    // 🔥 Firestore에 사용자 프로필이 없으면 생성
                                    const userDocRef = doc(db, "users", result.user.uid);
                                    const userDoc = await getDoc(userDocRef);
                                    
                                    if (!userDoc.exists()) {
                                        console.log("📝 [Google Login] Firestore에 사용자 프로필 생성");
                                        
                                        // 위치 정보 가져오기
                                        let location = "위치 정보 없음";
                                        try {
                                            if (navigator.geolocation) {
                                                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                                                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                                                });
                                                location = `lat:${pos.coords.latitude.toFixed(4)}, lng:${pos.coords.longitude.toFixed(4)}`;
                                            }
                                        } catch (err) {
                                            console.warn("⚠️ [Google Login] 위치 정보 가져오기 실패:", err);
                                        }
                                        
                                        // Firestore에 프로필 생성
                                        await setDoc(userDocRef, {
                                            uid: result.user.uid,
                                            email: result.user.email,
                                            displayName: result.user.displayName || result.user.email?.split("@")[0] || "사용자",
                                            photoURL: result.user.photoURL || null,
                                            location,
                                            aiProfile: true,
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString(),
                                        }, { merge: true });
                                        
                                        console.log("✅ [Google Login] Firestore 사용자 프로필 생성 완료");
                                    }
                                    
                                    // 로그인 성공 시 홈으로 이동
                                    navigate("/sports-hub", { replace: true });
                                    
                                    // 상태 해제
                                    isSigningInRef.current = false;
                                    setGoogleLoading(false);
                                    return;
                                } catch (popupError: any) {
                                    // 팝업이 차단되거나 실패한 경우 redirect로 fallback
                                    if (popupError.code === "auth/popup-closed-by-user" || 
                                        popupError.code === "auth/popup-blocked" ||
                                        popupError.code === "auth/cancelled-popup-request") {
                                        console.log("⚠️ [Google Login] 팝업 실패 → Redirect 방식으로 전환");
                                        await signInWithRedirect(auth, provider);
                                        // redirect는 페이지가 이동하므로 여기서 return
                                        return;
                                    }
                                    // 다른 오류는 아래 catch 블록에서 처리
                                    throw popupError;
                                }
                            } else {
                                // 📱 모바일 환경: Redirect 방식 사용
                                console.log("🔥 [Google Login] signInWithRedirect 호출 시작 (모바일 환경):", {
                                    timestamp: new Date().toISOString(),
                                    userAgent: navigator.userAgent,
                                    screenWidth: window.innerWidth,
                                });
                                
                                await signInWithRedirect(auth, provider);
                                // redirect는 페이지가 이동하므로 여기서 return
                                // 리다이렉션 후 결과는 App.tsx에서 처리
                                console.log("✅ [Google Login] 리다이렉션 시작 - Google 로그인 페이지로 이동합니다.");
                                return;
                            }
                        } catch (error: any) {
                            console.error("❌ [Google Login] 오류 발생:", {
                                code: error.code,
                                message: error.message,
                                timestamp: new Date().toISOString(),
                                refValue: isSigningInRef.current,
                                loadingState: googleLoading
                            });
                            
                            // 🔥 오류 발생 시 상태 해제 (무한 로그인 루프 방지)
                            isSigningInRef.current = false;
                            setGoogleLoading(false);
                            
                            // 🔥 오류 처리 순서 중요: popup-closed-by-user를 먼저 확인
                            if (error.code === "auth/popup-closed-by-user") {
                                console.log("⚠️ [Google Login] 사용자가 팝업을 닫았습니다.");
                                setError("로그인 창이 닫혔습니다. 다시 시도해주세요.");
                                // 상태는 이미 catch 블록 시작 부분에서 해제됨
                                return;
                            }
                            
                            // 🔥 cancelled-popup-request 오류 특별 처리
                            if (error.code === "auth/cancelled-popup-request") {
                                console.log("⚠️ [Google Login] 팝업 요청이 취소되었습니다. (중복 호출 감지)");
                                setError("로그인 창이 이미 열려있습니다. 기다려주세요...");
                                // 상태는 이미 catch 블록 시작 부분에서 해제됨
                                return;
                            }
                            
                            // 🔥 "The requested action is invalid" 오류 특별 처리
                            // ⚠️ 이 오류는 보통 팝업이 예기치 않게 닫혔을 때 발생
                            if (error.code === "auth/invalid-action" || 
                                error.message?.includes("invalid") || 
                                error.message?.includes("The requested action is invalid")) {
                                console.error("❌ [Google Login] 'The requested action is invalid' 오류 발생!");
                                console.error("   원인: 팝업이 예기치 않게 닫혔거나 OAuth state가 꼬였습니다.");
                                console.error("   해결: 잠시 후 다시 시도하거나 브라우저를 새로고침하세요.");
                                
                                setError("인증 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
                                // 상태는 이미 catch 블록 시작 부분에서 해제됨
                                return;
                            }
                            // 🔍 6. 오류 발생 시 상세 정보 로깅
                            const errorDetails = {
                                code: error.code,
                                message: error.message,
                                email: error.email,
                                credential: error.credential,
                                customData: error.customData,
                                stack: error.stack,
                                currentUrl: window.location.href,
                                referer: document.referrer,
                                hostname: window.location.hostname,
                                authDomain: auth.app.options.authDomain,
                                projectId: auth.app.options.projectId,
                                timestamp: new Date().toISOString(),
                            };
                            
                            console.error("❌ [Google Login] 로그인 실패 - 상세 정보:", errorDetails);
                            console.error("❌ [Google Login] 전체 오류 객체:", error);
                            
                            let errorMsg = "";

                            // 🔥 7. auth/requests-from-referer-are-blocked 오류 특별 처리
                            if (error.code === "auth/requests-from-referer-are-blocked" || 
                                error.message?.includes("requests-from-referer") || 
                                error.message?.includes("are-blocked") ||
                                error.code?.includes("requests-from-referer")) {
                                
                                errorMsg = 
                                    "❌ 인증 요청이 차단되었습니다.\n\n" +
                                    "🔍 발견된 문제: 승인된 도메인 누락 또는 클라이언트 ID 불일치\n\n" +
                                    "현재 도메인: " + window.location.hostname + "\n" +
                                    "예상 도메인: " + auth.app.options.authDomain + "\n\n" +
                                    "✅ 해결 방법:\n" +
                                    "1. Firebase Console → Authentication → Settings → Authorized domains\n" +
                                    "   - '" + window.location.hostname + "' 추가\n" +
                                    "   - '" + auth.app.options.authDomain + "' 확인\n\n" +
                                    "2. Firebase Console → Authentication → Sign-in method → Google\n" +
                                    "   - '웹 클라이언트 ID' 확인\n" +
                                    "   - Google Cloud Console의 OAuth 2.0 Web Client ID와 일치하는지 확인\n\n" +
                                    "3. Google Cloud Console → APIs & Services → Credentials\n" +
                                    "   - OAuth 2.0 클라이언트 ID 확인\n" +
                                    "   - '승인된 JavaScript 원본'에 현재 도메인 포함 여부 확인\n\n" +
                                    "4. 브라우저 캐시 삭제 후 새로고침 (Ctrl+Shift+R)\n\n" +
                                    `에러 코드: ${error.code || "unknown"}\n` +
                                    `에러 메시지: ${error.message || "없음"}\n\n` +
                                    "💡 개발자 콘솔(F12)에서 상세 정보를 확인하세요.";
                                
                                alert(errorMsg);
                                
                                // 🔍 개발 환경에서만 추가 디버깅 정보 표시
                                if (import.meta.env.DEV) {
                                    console.group("🔍 [개발 모드] 추가 디버깅 정보");
                                    console.log("현재 URL:", window.location.href);
                                    console.log("Referer:", document.referrer);
                                    console.log("Hostname:", window.location.hostname);
                                    console.log("Firebase Auth Domain:", auth.app.options.authDomain);
                                    console.log("Firebase Project ID:", auth.app.options.projectId);
                                    console.log("Firebase API Key:", auth.app.options.apiKey ? "✅ 설정됨" : "❌ 없음");
                                    console.groupEnd();
                                }
                            } else if (error.code === "auth/operation-not-allowed") {
                                errorMsg =
                                    "Google 로그인이 활성화되지 않았습니다.\n\nFirebase Console에서 활성화해주세요:\n1. Firebase Console > Authentication > Sign-in method\n2. Google 활성화\n3. Project support email 설정";
                                alert(errorMsg);
                            } else if (error.code === "auth/popup-closed-by-user") {
                                errorMsg = "로그인 창이 닫혔습니다. 다시 시도해주세요.";
                            } else if (error.code === "auth/popup-blocked") {
                                errorMsg =
                                    "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.";
                            } else if (error.message?.includes("invalid") || error.message?.includes("invalid action") || error.code === "auth/invalid-action") {
                                errorMsg = 
                                    "❌ 인증 요청이 거부되었습니다.\n\n" +
                                    "🔍 발견된 문제: OAuth 설정 문제\n\n" +
                                    "OAuth 동의 화면 또는 클라이언트 ID 설정에 문제가 있을 수 있습니다.\n\n" +
                                    "✅ 해결 방법:\n" +
                                    "1. Google Cloud Console → APIs & Services → OAuth consent screen\n" +
                                    "   - 앱 상태 확인 (테스트/프로덕션)\n" +
                                    "   - 테스트 상태라면 테스트 사용자 목록에 이메일 추가\n\n" +
                                    "2. Google Cloud Console → APIs & Services → Credentials\n" +
                                    "   - OAuth 2.0 클라이언트 ID 확인\n" +
                                    "   - '승인된 JavaScript 원본' 확인\n\n" +
                                    "3. Firebase Console → Authentication → Sign-in method → Google\n" +
                                    "   - '웹 클라이언트 ID' 확인\n\n" +
                                    "4. 브라우저 새로고침 (Ctrl+Shift+R)\n" +
                                    "5. Google 로그인 재시도\n\n" +
                                    `에러 코드: ${error.code || "unknown"}\n` +
                                    `에러 메시지: ${error.message || "없음"}`;
                                alert(errorMsg);
                            } else {
                                errorMsg = error.message || "구글 로그인에 실패했습니다.";
                            }

                            setError(errorMsg);
                        } finally {
                            // 🔥 반드시 로딩 상태 해제 (모든 경우에 실행)
                            isSigningInRef.current = false; // ref도 함께 해제
                            setGoogleLoading(false);
                            console.log("✅ [Google Login] 로그인 완료 - 중복 방지 해제");
                        }
                    }}
                    disabled={googleLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex flex-col gap-3"
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
                    className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm ${targetField === "password" ? "ring-2 ring-indigo-500" : ""
                        }`}
                />
                {error && !resetSuccess && <p className="text-red-500 text-sm">{error}</p>}
                {resetSuccess && (
                    <p className="text-green-600 text-sm bg-green-50 px-4 py-2 rounded-lg">
                        ✅ 비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.
                    </p>
                )}
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md"
                >
                    로그인
                </button>
            </form>

                <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetLoading || !email}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                >
                    {resetLoading ? "전송 중..." : "비밀번호를 잊으셨나요?"}
                </button>

                <Link
                    to="/login/phone"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
                >
                    전화번호로 로그인
                </Link>
                </div>

                <div className="mt-5 text-sm text-gray-600">
                    <Link to="/signup" className="text-blue-600 hover:underline">
                        회원가입
                    </Link>
                    {" · "}
                    <Link to="/start" className="hover:underline">
                        홈으로
                    </Link>
                </div>

                <footer className="mt-10 text-xs text-gray-400">
                    © 2025 YAGO SPORTS · Powered by AI
                </footer>
            </div>
        </div>
    );
}
