/**
 * 🔐 QR 기반 전화번호 로그인 페이지 (모바일)
 * 
 * 역할:
 * - QR 스캔 후 이 페이지로 이동
 * - 전화번호 입력 → SMS 인증
 * - 인증 성공 시 QR 세션에 userId 바인딩
 */

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { ConfirmationResult } from "firebase/auth";
import { bindUserToQRSession } from "@/lib/qrPhoneLogin";
import Logo from "@/components/common/Logo";
import { trackQRLogin } from "@/lib/eventLog";
import { ensureUserProfile } from "@/utils/userProfile";
import { sendSMSCode, confirmSMSCode } from "@/utils/authPhone";
import { getErrorMessage, logAuthError } from "@/utils/authErrors";
import { saveReferralCode } from "@/lib/applyReferral";
import { getRemainingCooldown } from "@/utils/smsCooldown";
import { isValidKoreanPhone, normalizePhoneNumber } from "@/utils/phone";
import { disposePhoneRecaptcha, isPhoneRecaptchaBusy } from "@/lib/phoneRecaptcha";

export default function QRPhoneLoginPage() {
  // 🔥 디버그: 컴포넌트 마운트 로깅
  useEffect(() => {
    console.log('[QR LOGIN PAGE] mounted', {
      pathname: window.location.pathname,
      search: window.location.search,
      timestamp: new Date().toISOString(),
    });
    
    // 경로 변경 감지 (리다이렉트 추적)
    const checkPath = () => {
      if (window.location.pathname !== '/qr-login') {
        console.error('[QR LOGIN PAGE] ⚠️ 경로가 변경되었습니다!', {
          expected: '/qr-login',
          actual: window.location.pathname,
          timestamp: new Date().toISOString(),
        });
      }
    };
    
    // 주기적으로 경로 확인 (리다이렉트 감지)
    const interval = setInterval(checkPath, 100);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("sessionId");

  // 🔥 추천 코드 처리 (로그인 전)
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      saveReferralCode(ref);
      console.log("📝 [QRPhoneLogin] 추천 코드 저장:", ref);
    }
  }, [searchParams]);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [cooldown, setCooldown] = useState(0); // 🔥 쿨다운 타이머 (초)
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false); // 🔥 (3) 재시도 금지 플래그

  // 🔥 인앱 브라우저 감지 (PWA/인앱 브라우저 대응)
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isInApp =
      ua.includes("kakao") ||
      ua.includes("naver") ||
      ua.includes("instagram") ||
      ua.includes("fb") ||
      ua.includes("line") ||
      ua.includes("samsungbrowser") ||
      (ua.includes("wv") && ua.includes("android")); // Android WebView
    
    // PWA 설치 상태 체크 (standalone 모드)
    const isPWA = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    
    if (isInApp || isPWA) {
      setIsInAppBrowser(true);
      console.warn("⚠️ [QRPhoneLogin] 인앱 브라우저/PWA 감지:", {
        isInApp,
        isPWA,
        userAgent: ua,
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      disposePhoneRecaptcha();
    };
  }, []);

  // 🔥 세션 ID 검증
  useEffect(() => {
    if (!sessionId) {
      setError("QR 코드가 만료되었습니다. PC에서 새 QR 코드를 생성해주세요.");
    } else {
      // 📊 이벤트 로깅: QR 스캔
      trackQRLogin.qrScanned(sessionId, {
        platform: "mobile",
        userAgent: navigator.userAgent,
      }).catch(console.warn);
    }
  }, [sessionId]);

  // 🔥 쿨다운 타이머 업데이트
  useEffect(() => {
    if (cooldown <= 0) return;
    
    const timer = setInterval(() => {
      if (phoneNumber) {
        const remaining = getRemainingCooldown(normalizePhoneNumber(phoneNumber));
        setCooldown(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [cooldown, phoneNumber]);

  // 🔥 전화번호 인증 요청
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ 필수 조건 체크
    if (!sessionId) {
      setError("세션 ID가 없습니다. QR 코드를 다시 스캔해주세요.");
      return;
    }

    if (isPhoneRecaptchaBusy()) {
      setError("인증번호를 발송하는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!isValidKoreanPhone(phoneNumber)) {
      setError("휴대폰 번호를 올바르게 입력해주세요. (예: 01056890800)");
      return;
    }

    // 재시도 한도 체크
    if (retryCount >= 3) {
      setError("재시도 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedPhone = normalizePhoneNumber(phoneNumber);
      console.log("🔐 [QRPhoneLogin] SMS 인증 요청 시작:", {
        formattedPhone,
        sessionId,
        retryCount,
      });
      
      // 📊 이벤트 로깅: 전화번호 입력 시작
      trackQRLogin.phoneInputStart(sessionId, {
        platform: "mobile",
      }).catch(console.warn);
      
      // 📊 이벤트 로깅: SMS 요청
      trackQRLogin.smsRequested(sessionId, formattedPhone, {
        platform: "mobile",
      }).catch(console.warn);

      // 🔥 authPhone 유틸리티 사용 (재시도 제한 포함)
      const confirmation = await sendSMSCode(formattedPhone);
      
      console.log("✅ [QRPhoneLogin] SMS 전송 완료:", {
        verificationId: confirmation.verificationId ? "✅ 존재" : "❌ 없음",
      });
      
      setConfirmationResult(confirmation);
      setStep("code");
      setRetryCount(0); // 성공 시 재시도 카운터 리셋
      
      // 🔥 쿨다운 타이머 시작
      const remaining = getRemainingCooldown(formattedPhone);
      setCooldown(remaining);
      
      // 📊 이벤트 로깅: SMS 전송 성공
    } catch (err: any) {
      console.error("❌ [QRPhoneLogin] SMS 전송 실패:", {
        code: err.code,
        message: err.message,
        stack: err.stack,
      });
      
      // 📊 이벤트 로깅: SMS 요청 실패
      trackQRLogin.smsFailed(sessionId, err.code || "unknown", {
        platform: "mobile",
        errorMessage: err.message,
        retryCount,
      }).catch(console.warn);
      
      // 🔥 에러 분류 및 로깅 (상세 정보 포함)
      const errorInfo = logAuthError(err, { step: "send", phoneNumber, retryCount });
      const errorType = errorInfo.type;
      
      // 🔥 (3) 에러 분기: 특수 에러 처리
      const errorCode = err?.code || err?.originalError?.code || "";
      
      // 🔥 NO_VERIFICATION_ID: SMS 미발송 (테스트 번호 등록됨)
      if (errorCode === "NO_VERIFICATION_ID" || err?.noSmsSent) {
        console.error("❌ [QRPhoneLogin] verificationId 없음 → SMS 미발송");
        setError("SMS가 발송되지 않았습니다. Firebase Console에서 테스트 전화번호를 삭제하고 다시 시도해주세요.");
        setRetryCount(999);
        setCooldown(0);
        setRateLimitExceeded(true);
        return;
      }
      
      // 🔥 RECAPTCHA_ERROR: reCAPTCHA 문제
      if (errorCode === "RECAPTCHA_ERROR" || errorCode.includes("captcha") || errorCode.includes("recaptcha")) {
        console.error("❌ [QRPhoneLogin] reCAPTCHA 에러");
        setError("보안 확인에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.");
        disposePhoneRecaptcha();
        return;
      }
      
      // 🔥 auth/too-many-requests: 재시도 금지
      if (errorCode === "auth/too-many-requests" || errorCode.includes("too-many-requests") || err?.rateLimitExceeded) {
        console.error("❌ [QRPhoneLogin] too-many-requests 에러 → 재시도 금지 UI 표시");
        setError("오늘 인증 횟수를 초과했습니다. 내일 다시 시도해주세요.");
        setRetryCount(999); // 🔥 재시도 불가능하도록 설정
        setCooldown(0); // 쿨다운 타이머 숨김
        setRateLimitExceeded(true); // 🔥 재시도 금지 플래그 설정
        return; // 🔥 재시도 로직 실행 안 함
      }
      
      // 🔥 에러 메시지 (authErrors 유틸리티 사용)
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      // 🔥 UNKNOWN 에러인 경우 상세 로깅
      if (errorType === "UNKNOWN") {
        console.error("❌ [QRPhoneLogin] UNKNOWN 에러 발생:", {
          code: err?.code,
          message: err?.message,
          stack: err?.stack,
          error: err,
          phoneNumber,
          retryCount,
          isInAppBrowser,
          userAgent: navigator.userAgent,
        });
      }
      
      // 재시도 가능한 경우 카운터 증가
      if (errorType !== "RETRY_LIMIT" && retryCount < 3) {
        setRetryCount(prev => prev + 1);
      }
      
      // 🔥 쿨다운 에러인 경우 타이머 표시
      if (errorType === "SMS_COOLDOWN" && phoneNumber) {
        const remaining = getRemainingCooldown(normalizePhoneNumber(phoneNumber));
        setCooldown(remaining);
      }
      
      // reCAPTCHA 관련 에러인 경우 verifier 재생성 필요
      if (err.code === "auth/captcha-check-failed" || err.code === "auth/internal-error") {
        console.warn("⚠️ [QRPhoneLogin] reCAPTCHA 에러 감지, 전역 verifier 정리");
        disposePhoneRecaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔥 인증번호 확인
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !sessionId) return;

    setLoading(true);
    setError(null);

    try {
      console.log("🔐 [QRPhoneLogin] 인증번호 확인 중...");
      
      // 🔥 authPhone 유틸리티 사용
      const result = await confirmSMSCode(verificationCode);
      const user = result.user;
      const userId = user.uid;

      console.log("✅ [QRPhoneLogin] 인증 성공:", userId);

      // 🔥 자동 프로필 생성/업데이트
      try {
        await ensureUserProfile(user);
        console.log("✅ [QRPhoneLogin] 유저 프로필 생성/업데이트 완료");
      } catch (profileError) {
        console.error("⚠️ [QRPhoneLogin] 프로필 생성 실패 (무시하고 계속):", profileError);
        // 프로필 생성 실패해도 로그인은 계속 진행
      }

      // QR 세션에 사용자 바인딩
      await bindUserToQRSession(sessionId, userId);
      
      // 📊 이벤트 로깅: SMS 인증 성공
      trackQRLogin.smsVerified(sessionId, userId, {
        platform: "mobile",
      }).catch(console.warn);

      // 성공 메시지 표시
      setError(null);
      
      // 2초 후 안내 메시지
      setTimeout(() => {
        alert("✅ 로그인 완료!\nPC에서 자동으로 로그인됩니다.");
      }, 500);
    } catch (err: any) {
      console.error("❌ [QRPhoneLogin] 인증 실패:", err);
      
      // 📊 이벤트 로깅: SMS 인증 실패
      trackQRLogin.smsFailed(sessionId, err.code || "unknown", {
        platform: "mobile",
        errorMessage: err.message,
        step: "verification",
      }).catch(console.warn);
      
      // 🔥 에러 분류 및 로깅 (상세 정보 포함)
      const errorInfo = logAuthError(err, { step: "verify" });
      const errorType = errorInfo.type;
      
      // 🔥 에러 메시지 (authErrors 유틸리티 사용)
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      // 🔥 UNKNOWN 에러인 경우 상세 로깅
      if (errorType === "UNKNOWN") {
        console.error("❌ [QRPhoneLogin] 인증번호 확인 중 UNKNOWN 에러 발생:", {
          code: err?.code,
          message: err?.message,
          stack: err?.stack,
          error: err,
          verificationCodeLength: verificationCode.length,
          hasConfirmationResult: !!confirmationResult,
          isInAppBrowser,
          userAgent: navigator.userAgent,
        });
      }
      
      // 코드 만료 시 전화번호 입력 단계로 복귀
      if (errorType === "CODE_EXPIRED") {
        setStep("phone");
        setConfirmationResult(null);
        setVerificationCode("");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "100vh",
        padding: 20,
        background: "#fafafa"
      }}>
        <Logo className="w-20 mx-auto mb-4" alt="YAGO SPORTS" />
        <div style={{ marginTop: 40, textAlign: "center", maxWidth: 400 }}>
          <div style={{ color: "#ef4444", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            QR 코드가 만료되었습니다.
          </div>
          <div style={{ color: "#666", fontSize: 14 }}>
            PC에서 새 QR 코드를 생성해주세요.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      padding: 20,
      background: "#fafafa"
    }}>
      <Logo className="w-20 mx-auto mb-4" alt="YAGO SPORTS" />
      
      <div style={{
        width: "100%",
        maxWidth: 400,
        background: "#fff",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        marginTop: 40,
      }}>
        <h2 style={{ 
          fontSize: 20, 
          fontWeight: 600, 
          marginBottom: 8,
          textAlign: "center"
        }}>
          {step === "phone" ? "전화번호 입력" : "인증번호 확인"}
        </h2>
        
        <p style={{ 
          fontSize: 14, 
          color: "#666", 
          textAlign: "center",
          marginBottom: 24
        }}>
          {step === "phone" 
            ? "전화번호를 입력하면 인증번호가 전송됩니다."
            : "전송된 인증번호를 입력해주세요."}
        </p>

        {/* 인앱 브라우저/PWA 안내 */}
        {isInAppBrowser && (
          <div style={{
            background: "#fef3c7",
            border: "1px solid #fbbf24",
            color: "#92400e",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            textAlign: "center",
          }}>
            ⚠️ 원활한 로그인을 위해 외부 브라우저(Chrome/Safari)에서 열어주세요.
          </div>
        )}

        {error && (
          <div style={{
            background: "#fee2e2",
            color: "#dc2626",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendCode}>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="전화번호를 입력해주세요"
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 16,
              }}
            />

            <button
              type="submit"
              disabled={
                loading ||
                !isValidKoreanPhone(phoneNumber) ||
                cooldown > 0 ||
                rateLimitExceeded
              }
              style={{
                width: "100%",
                padding: 14,
                background: loading || cooldown > 0 || rateLimitExceeded ? "#ccc" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: loading || cooldown > 0 || rateLimitExceeded ? "not-allowed" : "pointer",
              }}
            >
              {loading 
                ? "전송 중..." 
                : rateLimitExceeded
                  ? "오늘 인증 횟수 초과"
                  : cooldown > 0 
                    ? `${cooldown}초 후 재전송` 
                    : "인증번호 전송"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6자리 인증번호"
              maxLength={6}
              required
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 16,
                textAlign: "center",
                letterSpacing: 8,
              }}
            />
            
            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              style={{
                width: "100%",
                padding: 14,
                background: loading ? "#ccc" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                marginBottom: 12,
              }}
            >
              {loading ? "확인 중..." : "인증번호 확인"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setVerificationCode("");
                setConfirmationResult(null);
                setError(null);
              }}
              style={{
                width: "100%",
                padding: 12,
                background: "transparent",
                color: "#666",
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              다시 전송하기
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
