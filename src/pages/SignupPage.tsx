import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { upgradeGuestAccount } from "@/utils/upgradeGuestAccount";
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [targetField, setTargetField] = useState<"email" | "password" | "confirm" | null>(null);
  const navigate = useNavigate();
  
  // 🔥 모바일 환경에서 팝업 사용 가능 여부 확인
  const canUsePopup = (): boolean => {
    const ua = navigator.userAgent.toLowerCase();
    // 모바일 웹뷰 감지
    if (/wv|webview|android.+version\/|iphone|ipad|ipod/i.test(ua)) {
      console.log("📱 [Google Signup] 모바일 웹뷰 감지 - Redirect 방식 사용");
      return false;
    }
    // 작은 화면 감지
    if (window.innerWidth < 420) {
      console.log("📱 [Google Signup] 작은 화면 감지 - Redirect 방식 사용");
      return false;
    }
    console.log("💻 [Google Signup] 데스크톱 환경 - Popup 방식 사용");
    return true;
  };

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
      
      navigate("/sports-hub");
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
        className="w-full max-w-sm sm:max-w-md flex flex-col gap-3 items-center"
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
            // 🔥 중복 클릭 방지
            if (googleLoading) {
              console.log("⚠️ [Google Signup] 이미 로그인 진행 중...");
              return;
            }
            
            // 🔥 이미 팝업이 열려있는지 확인
            const existingPopup = document.querySelector('iframe[src*="firebaseapp.com"]') || 
                                document.querySelector('iframe[src*="accounts.google.com"]');
            if (existingPopup) {
              console.log("⚠️ [Google Signup] 이미 팝업이 열려있습니다. 기다려주세요...");
              setError("이미 로그인 창이 열려있습니다. 기다려주세요...");
              return;
            }
            
            setGoogleLoading(true);
            setError("");
            
            try {
              // 🔍 1. 사전 검증: 현재 환경 정보 로깅
              const currentUrl = window.location.href;
              const referer = document.referrer || currentUrl;
              const hostname = window.location.hostname;
              
              console.log("🔍 [Google Signup] 사전 검증 시작:", {
                currentUrl,
                referer,
                hostname,
                authDomain: auth.app.options.authDomain,
                projectId: auth.app.options.projectId,
                apiKey: auth.app.options.apiKey ? `${auth.app.options.apiKey.substring(0, 10)}...` : "없음",
                timestamp: new Date().toISOString(),
              });
              
              // 🔍 2. Firebase Auth 인스턴스 정보 확인
              console.log("🔍 [Google Signup] Firebase Auth 인스턴스 정보:", {
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
              console.log("🔍 [Google Signup] GoogleAuthProvider 생성 완료:", {
                providerId: provider.providerId,
              });
              
              // 🔍 4. signInWithPopup 호출 전 최종 확인
              console.log("🔍 [Google Signup] signInWithPopup 호출 직전:", {
                authInstance: auth ? "✅ 존재" : "❌ 없음",
                provider: provider ? "✅ 존재" : "❌ 없음",
                currentDomain: hostname,
                expectedAuthDomain: auth.app.options.authDomain,
              });
              
              // 🔥 모바일 환경 감지 및 적절한 로그인 방식 선택
              const usePopup = canUsePopup();
              
              if (usePopup) {
                // 💻 데스크톱 환경: Popup 방식 사용
                console.log("🔥 [Google Signup] signInWithPopup 호출 시작:", {
                  timestamp: new Date().toISOString(),
                });
                
                try {
                  const result = await signInWithPopup(auth, provider);
                  
                  console.log("✅ [Google Signup] Google 로그인 성공:", {
                    userEmail: result.user.email,
                    userUid: result.user.uid,
                  });
                  
                  // 🔥 Firestore에 사용자 프로필이 없으면 생성
                  const userDocRef = doc(db, "users", result.user.uid);
                  const userDoc = await getDoc(userDocRef);
                  
                  if (!userDoc.exists()) {
                    console.log("📝 [Google Signup] Firestore에 사용자 프로필 생성");
                    
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
                      console.warn("⚠️ [Google Signup] 위치 정보 가져오기 실패:", err);
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
                    
                    console.log("✅ [Google Signup] Firestore 사용자 프로필 생성 완료");
                  }
                  
                  // 로그인 성공 시 홈으로 이동
                  navigate("/sports-hub", { replace: true });
                  
                  // 상태 해제
                  setGoogleLoading(false);
                  return;
                } catch (popupError: any) {
                  // 팝업이 차단되거나 실패한 경우 redirect로 fallback
                  if (popupError.code === "auth/popup-closed-by-user" || 
                      popupError.code === "auth/popup-blocked" ||
                      popupError.code === "auth/cancelled-popup-request") {
                    console.log("⚠️ [Google Signup] 팝업 실패 → Redirect 방식으로 전환");
                    await signInWithRedirect(auth, provider);
                    // redirect는 페이지가 이동하므로 여기서 return
                    return;
                  }
                  // 다른 오류는 아래 catch 블록에서 처리
                  throw popupError;
                }
              } else {
                // 📱 모바일 환경: Redirect 방식 사용
                console.log("🔥 [Google Signup] signInWithRedirect 호출 시작 (모바일 환경):", {
                  timestamp: new Date().toISOString(),
                  userAgent: navigator.userAgent,
                  screenWidth: window.innerWidth,
                });
                
                await signInWithRedirect(auth, provider);
                // redirect는 페이지가 이동하므로 여기서 return
                // 리다이렉션 후 결과는 App.tsx에서 처리
                console.log("✅ [Google Signup] 리다이렉션 시작 - Google 로그인 페이지로 이동합니다.");
                return;
              }
            } catch (error: any) {
              // 🔥 cancelled-popup-request 오류 특별 처리
              if (error.code === "auth/cancelled-popup-request") {
                console.log("⚠️ [Google Signup] 팝업 요청이 취소되었습니다.");
                setError("로그인 창이 이미 열려있습니다. 기다려주세요...");
                setGoogleLoading(false);
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
              
              console.error("❌ [Google Signup] 회원가입 실패 - 상세 정보:", errorDetails);
              console.error("❌ [Google Signup] 전체 오류 객체:", error);
              
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
                errorMsg = "Google 로그인이 활성화되지 않았습니다.\n\nFirebase Console에서 활성화해주세요:\n1. Firebase Console > Authentication > Sign-in method\n2. Google 활성화\n3. Project support email 설정";
                alert(errorMsg);
              } else if (error.code === "auth/popup-closed-by-user") {
                errorMsg = "로그인 창이 닫혔습니다. 다시 시도해주세요.";
              } else if (error.code === "auth/popup-blocked") {
                errorMsg = "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.";
              } else {
                errorMsg = error.message || "구글 회원가입에 실패했습니다.";
              }
              setError(errorMsg);
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
        © 2025 YAGO VIBE · Powered by AI
      </footer>
    </div>
  );
}
