/**
 * 🔥 초경량 가입 화면 (Lazy Signup용) - STEP 4 LOCK
 * 
 * 핵심 원칙:
 * - 입력 필드 최소
 * - 이유 설명 ❌
 * - "계속" 느낌 유지
 * - 가입 후 바로 원래 행동 복귀
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPhoneNumber } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signInWithGoogleAdaptive } from "@/utils/authHelpers";
import Logo from "@/components/common/Logo";
import { isValidKoreanPhone, normalizePhoneNumber } from "@/utils/phone";
import { getPostSignupAction, clearPostSignupAction, PostSignupAction } from "@/lib/userState";
import { resumeAction } from "@/lib/actionResumer";
import {
  disposePhoneRecaptcha,
  getPhoneRecaptcha,
  isPhoneRecaptchaBusy,
  setPhoneRecaptchaBusy,
} from "@/lib/phoneRecaptcha";

export default function SignupLazyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "verify">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const postSignupAction = location.state?.postSignupAction as PostSignupAction | undefined;
  const returnTo = location.state?.returnTo || "/";

  useEffect(() => {
    return () => {
      disposePhoneRecaptcha();
    };
  }, []);

  const handlePhoneSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPhoneRecaptchaBusy()) {
      setError("인증번호를 발송하는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setError("");
    setLoading(true);
    setPhoneRecaptchaBusy(true);

    try {
      if (!isValidKoreanPhone(phone)) {
        throw new Error("휴대폰 번호를 올바르게 입력해주세요. (예: 01056890800)");
      }

      const verifier = getPhoneRecaptcha(auth);
      const confirmation = await signInWithPhoneNumber(
        auth,
        normalizePhoneNumber(phone),
        verifier
      );
      setConfirmationResult(confirmation);
      setStep("verify");
      disposePhoneRecaptcha();
    } catch (err: any) {
      console.error("전화번호 인증 오류:", err);
      disposePhoneRecaptcha();
      setError(err.message || "인증에 실패했습니다");
    } finally {
      setPhoneRecaptchaBusy(false);
      setLoading(false);
    }
  };

  const handleCodeVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!confirmationResult) {
        throw new Error("인증 정보가 없습니다");
      }

      const result = await confirmationResult.confirm(code);
      const user = result.user;

      // 사용자 프로필 생성
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        displayName: user.phoneNumber?.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3") || "사용자",
        createdAt: new Date(),
      });

      // 가입 완료 후 복귀 로직
      handleSignupComplete();
    } catch (err: any) {
      console.error("코드 확인 오류:", err);
      setError("인증 코드가 올바르지 않습니다. 다시 한 번만 시도해 주세요");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithGoogleAdaptive(auth, provider);
    } catch (err: any) {
      console.error("구글 회원가입 오류:", err);
      setError(err.message || "구글 회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupComplete = () => {
    // 가입 완료 후 복귀 로직 (절대 규칙 순서)
    // 1. 인증 성공 ✅ (위에서 완료)
    // 2. postSignupAction 존재 확인
    const action = getPostSignupAction();
    
    // 3. 해당 액션 자동 실행
    if (action) {
      resumeAction(action);
      clearPostSignupAction();
    } else {
      // 액션이 없으면 원래 화면으로 복귀
      navigate(returnTo, { replace: true });
    }
    
    // 4. 모달/가입 화면 완전 종료 (navigate로 처리됨)
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-none md:max-w-3xl">
        <div className="flex flex-col items-center mb-8">
          <Logo size={96} className="mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h1>
          
          {/* 가입 중 이탈 방지 규칙 (반드시 표시) */}
          <p className="text-gray-600 text-sm text-center">
            지금 하던 작업을
            <br />
            가입 후 바로 이어서 할 수 있어요
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 전화번호 + OTP (우선순위 1) */}
          {step === "phone" ? (
            <form onSubmit={handlePhoneSignup} className="space-y-4 mb-4">
              <div>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="전화번호를 입력해주세요"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">전송 시 +82 형식으로 자동 변환됩니다.</p>
              </div>
              <button
                type="submit"
                disabled={loading || !isValidKoreanPhone(phone)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "인증번호 발송 중..." : "인증번호 받기"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeVerify} className="space-y-4 mb-4">
              <div>
                <input
                  type="text"
                  placeholder="인증번호 6자리"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="w-full rounded-xl bg-white border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "확인 중..." : "가입하고 계속하기"}
              </button>
            </form>
          )}

          {/* 구분선 */}
          {step === "phone" && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">또는</span>
                </div>
              </div>

              {/* Google 로그인 (우선순위 2) */}
              <button
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                구글로 가입하고 계속하기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

