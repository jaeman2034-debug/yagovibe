// src/utils/authPhone.ts
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// Firebase v9에서 signInWithPhoneNumber가 반환하는 객체 타입
// ConfirmationResult는 export되지 않으므로 직접 타입 정의
interface PhoneAuthConfirmation {
  verificationId: string;
  confirm: (code: string) => Promise<any>;
}

// 전역 recaptcha verifier 저장
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: PhoneAuthConfirmation;
  }
}

/**
 * Invisible reCAPTCHA 설정
 * @param containerId - reCAPTCHA를 렌더링할 컨테이너 ID (기본값: "recaptcha-container")
 */
export const setupInvisibleRecaptcha = (containerId: string = "recaptcha-container") => {
  // DOM 요소가 존재하는지 확인
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`reCAPTCHA 컨테이너를 찾을 수 없습니다. ID: ${containerId}`);
  }

  // auth 객체가 제대로 초기화되었는지 확인
  if (!auth) {
    throw new Error("Firebase Auth가 초기화되지 않았습니다.");
  }

  // 기존 verifier가 있으면 정리
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.warn("기존 reCAPTCHA 정리 실패:", e);
    }
    window.recaptchaVerifier = undefined;
  }

  try {
    // 🔥 Firebase v9 올바른 문법: RecaptchaVerifier(auth, containerId, options)
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      containerId,
      {
        size: "invisible",
        callback: () => {
          console.log("✅ reCAPTCHA 인증 완료");
        },
        "expired-callback": () => {
          console.warn("⚠️ reCAPTCHA 만료됨");
        },
      }
    );
    console.log("✅ Invisible reCAPTCHA 설정 완료");
  } catch (error: any) {
    console.error("❌ reCAPTCHA 설정 실패:", error);
    window.recaptchaVerifier = undefined;
    
    // 더 자세한 에러 정보 제공
    let errorMessage = "reCAPTCHA 설정에 실패했습니다.";
    if (error.message) {
      errorMessage = `reCAPTCHA 설정 실패: ${error.message}`;
    } else if (error.code) {
      errorMessage = `reCAPTCHA 설정 실패: ${error.code}`;
    }
    
    throw new Error(errorMessage);
  }
  
  return window.recaptchaVerifier;
};

/**
 * SMS 인증번호 전송
 * @param phoneNumber - 전화번호 (예: "+821012345678")
 * @returns PhoneAuthConfirmation 객체 (verificationId와 confirm 메서드 포함)
 */
export const sendSMSCode = async (phoneNumber: string): Promise<PhoneAuthConfirmation> => {
  try {
    // 전화번호 형식 검증
    if (!phoneNumber.startsWith("+")) {
      throw new Error("전화번호는 국가 코드와 함께 입력해주세요 (예: +821012345678)");
    }

    // reCAPTCHA 설정
    setupInvisibleRecaptcha();

    if (!window.recaptchaVerifier) {
      throw new Error("reCAPTCHA 설정에 실패했습니다.");
    }

    console.log("📱 SMS 인증번호 전송 시도:", phoneNumber);

    // SMS 전송
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      window.recaptchaVerifier
    );

    // 전역에 저장 (인증번호 확인 시 사용)
    window.confirmationResult = confirmationResult;

    console.log("✅ SMS 인증번호 전송 성공");
    return confirmationResult;
  } catch (error: any) {
    console.error("❌ SMS 전송 실패:", error);
    
    // reCAPTCHA 초기화 (에러 발생 시)
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      } catch (clearError) {
        console.error("reCAPTCHA 초기화 실패:", clearError);
      }
    }

    // 에러 메시지 한글화
    if (error.code === "auth/invalid-phone-number") {
      throw new Error("유효하지 않은 전화번호 형식입니다.");
    } else if (error.code === "auth/too-many-requests") {
      throw new Error("너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.");
    } else if (error.code === "auth/captcha-check-failed") {
      throw new Error("reCAPTCHA 검증에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.");
    } else {
      throw new Error(error.message || "SMS 전송에 실패했습니다.");
    }
  }
};

/**
 * SMS 인증번호 확인
 * @param code - 인증번호 (예: "123456")
 * @returns UserCredential
 */
export const confirmSMSCode = async (code: string) => {
  try {
    if (!window.confirmationResult) {
      throw new Error("인증번호 전송이 먼저 필요합니다.");
    }

    if (!code || code.length < 6) {
      throw new Error("인증번호는 6자리 이상이어야 합니다.");
    }

    console.log("🔑 인증번호 확인 시도");

    const result = await window.confirmationResult.confirm(code);

    console.log("✅ 인증번호 확인 성공:", result.user.phoneNumber);

    // 인증 완료 후 정리
    window.confirmationResult = undefined;
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      } catch (clearError) {
        console.error("reCAPTCHA 정리 실패:", clearError);
      }
    }

    return result;
  } catch (error: any) {
    console.error("❌ 인증번호 확인 실패:", error);

    // 에러 메시지 한글화
    if (error.code === "auth/invalid-verification-code") {
      throw new Error("인증번호가 올바르지 않습니다.");
    } else if (error.code === "auth/code-expired") {
      throw new Error("인증번호가 만료되었습니다. 다시 요청해주세요.");
    } else {
      throw new Error(error.message || "인증번호 확인에 실패했습니다.");
    }
  }
};

/**
 * reCAPTCHA 정리 (컴포넌트 언마운트 시 호출)
 */
export const cleanupRecaptcha = () => {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = undefined;
    } catch (error) {
      console.error("reCAPTCHA 정리 실패:", error);
    }
  }
  window.confirmationResult = undefined;
};

