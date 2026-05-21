// src/utils/authPhone.ts
import { signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureDurableAuthPersistence } from "@/utils/authHelpers";
import {
  disposePhoneRecaptcha,
  getPhoneRecaptcha,
  isPhoneRecaptchaBusy,
  setPhoneRecaptchaBusy,
} from "@/lib/phoneRecaptcha";

interface PhoneAuthConfirmation {
  verificationId: string;
  confirm: (code: string) => Promise<any>;
}

declare global {
  interface Window {
    confirmationResult?: PhoneAuthConfirmation;
  }
}

/**
 * SMS 인증번호 전송
 * @param phoneNumber - E.164 (예: "+821056890800", `@/utils/phone`의 `normalizePhoneNumber` 권장)
 */
export const sendSMSCode = async (phoneNumber: string): Promise<PhoneAuthConfirmation> => {
  if (isPhoneRecaptchaBusy()) {
    throw new Error("인증번호를 발송하는 중입니다. 잠시 후 다시 시도해 주세요.");
  }

  setPhoneRecaptchaBusy(true);

  try {
    if (!phoneNumber.startsWith("+")) {
      throw new Error(
        "전화번호를 입력해주세요 (자동으로 +82 형식으로 변환됩니다)"
      );
    }

    const verifier = getPhoneRecaptcha(auth);

    console.log("📱 SMS 인증번호 전송 시도:", phoneNumber);

    await ensureDurableAuthPersistence(auth);

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      verifier
    );

    disposePhoneRecaptcha();

    window.confirmationResult = confirmationResult;

    console.log("✅ SMS 인증번호 전송 성공");
    return confirmationResult;
  } catch (error: any) {
    console.error("❌ SMS 전송 실패:", error);

    disposePhoneRecaptcha();

    if (error.code === "auth/invalid-phone-number") {
      throw new Error(
        "전화번호 형식이 올바르지 않습니다. 휴대폰 번호(010…)를 다시 확인해 주세요."
      );
    } else if (error.code === "auth/too-many-requests") {
      throw new Error("너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.");
    } else if (error.code === "auth/captcha-check-failed") {
      throw new Error("reCAPTCHA 검증에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.");
    } else if (error.code === "auth/invalid-app-credential") {
      throw new Error(
        "보안 확인(reCAPTCHA) 또는 앱 설정 문제로 문자를 보낼 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요. Chrome 등 일반 브라우저에서 열어 주세요."
      );
    } else {
      throw new Error(error.message || "SMS 전송에 실패했습니다.");
    }
  } finally {
    setPhoneRecaptchaBusy(false);
  }
};

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

    window.confirmationResult = undefined;
    disposePhoneRecaptcha();

    return result;
  } catch (error: any) {
    console.error("❌ 인증번호 확인 실패:", error);

    if (error.code === "auth/invalid-verification-code") {
      throw new Error("인증번호가 올바르지 않습니다.");
    } else if (error.code === "auth/code-expired") {
      throw new Error("인증번호가 만료되었습니다. 다시 요청해주세요.");
    } else {
      throw new Error(error.message || "인증번호 확인에 실패했습니다.");
    }
  }
};

export const cleanupRecaptcha = () => {
  disposePhoneRecaptcha();
  window.confirmationResult = undefined;
};
