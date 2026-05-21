/**
 * 전화(SMS) 인증용 reCAPTCHA — 프로젝트 전역 1인스턴스 + 수명주기 단일화
 * new RecaptchaVerifier는 이 모듈에서만 호출할 것.
 */
import type { Auth } from "firebase/auth";
import { RecaptchaVerifier } from "firebase/auth";

declare global {
  interface Window {
    __phoneRecaptcha?: RecaptchaVerifier;
    __phoneRecaptchaBusy?: boolean;
  }
}

const CONTAINER_ID = "recaptcha-container";

function ensureContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = CONTAINER_ID;
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, {
      position: "fixed",
      left: "-9999px",
      bottom: "0",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      pointerEvents: "none",
      opacity: "0",
    });
    document.body.appendChild(el);
  }
  return el;
}

function wipeContainer() {
  const el = document.getElementById(CONTAINER_ID);
  if (el) el.replaceChildren();
}

export function disposePhoneRecaptcha() {
  try {
    window.__phoneRecaptcha?.clear();
  } catch {
    // ignore
  }
  window.__phoneRecaptcha = undefined;
  window.__phoneRecaptchaBusy = false;
  wipeContainer();
}

export function getPhoneRecaptcha(auth: Auth): RecaptchaVerifier {
  ensureContainer();

  if (window.__phoneRecaptcha) {
    return window.__phoneRecaptcha;
  }

  wipeContainer();

  const verifier = new RecaptchaVerifier(auth, CONTAINER_ID, {
    size: "invisible",
    callback: () => {
      console.log("✅ [phoneRecaptcha] reCAPTCHA 완료");
    },
    "expired-callback": () => {
      console.warn("⚠️ [phoneRecaptcha] reCAPTCHA 만료");
    },
  });

  window.__phoneRecaptcha = verifier;
  return verifier;
}

export function isPhoneRecaptchaBusy(): boolean {
  return Boolean(window.__phoneRecaptchaBusy);
}

export function setPhoneRecaptchaBusy(busy: boolean) {
  window.__phoneRecaptchaBusy = busy;
}
