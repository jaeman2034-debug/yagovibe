// src/voice/useVoiceSignupFields.ts
// 🔥 회원가입 필드 음성 입력 훅 (v2 안정화 버전)

import { useState, useCallback, useRef, useEffect } from "react";
import { speechEngine } from "./speechEngine";
import { parseFullEmail } from "./parseFullEmail";
import { parsePassword } from "./parsePassword";

interface UseVoiceSignupFieldsOptions {
  onEmailComplete?: () => void; // 이메일 입력 완료 시 콜백
  onPasswordComplete?: () => void; // 비밀번호 입력 완료 시 콜백
}

export function useVoiceSignupFields(options: UseVoiceSignupFieldsOptions = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // 🔥 비밀번호 확인 시 일치 여부를 확인하기 위해 password 최신값 유지
  const passwordRef = useRef(password);
  
  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  /**
   * 이메일 필드 음성 입력 시작
   * 🔥 무한 반복 방지: 3회 실패 후 탈출 로직
   */
  const emailRetryCountRef = useRef(0);
  const MAX_RETRY = 3; // 최대 3회 재시도

  const startEmailFieldVoice = useCallback(async () => {
    try {
      // 🔥 단계 전환 시 STT 정지 후 TTS 시작
      speechEngine.stopSTT();
      
      const text = await speechEngine.listenOnce("field");
      console.log("[VoiceSignupFields] 이메일 인식:", text);

      if (!text || text.length < 5) {
        emailRetryCountRef.current++;
        if (emailRetryCountRef.current < 2) {
          await speechEngine.speak("이메일을 잘 이해하지 못했습니다. 다시 한 번 말씀해주세요.");
          setTimeout(() => {
            startEmailFieldVoice();
          }, 500);
        } else if (emailRetryCountRef.current < MAX_RETRY) {
          // 🔥 2회 실패 시 fallback 대화 흐름
          await speechEngine.speak("이메일 입력이 어려우신가요? 중단하시겠습니까? 중단하려면 '중단'이라고 말씀해주세요.");
          const response = await speechEngine.listenOnce("command");
          if (response.includes("중단") || response.includes("취소")) {
            await speechEngine.speak("이메일 입력을 중단했습니다.");
            emailRetryCountRef.current = 0;
            return;
          }
          // 계속 시도
          await speechEngine.speak("다시 시도하겠습니다. 이메일을 말씀해주세요.");
          setTimeout(() => {
            startEmailFieldVoice();
          }, 500);
        } else {
          // 🔥 3회 실패 후 최종 탈출
          await speechEngine.speak("음성 인식이 잘 되지 않아, 직접 입력으로 전환해주세요.");
          emailRetryCountRef.current = 0;
        }
        return;
      }

      const parsed = parseFullEmail(text);
      if (!parsed) {
        emailRetryCountRef.current++;
        if (emailRetryCountRef.current < 2) {
          await speechEngine.speak("이메일 형식을 이해하지 못했습니다. 다시 한 번 말씀해주세요.");
          setTimeout(() => {
            startEmailFieldVoice();
          }, 500);
        } else if (emailRetryCountRef.current < MAX_RETRY) {
          // 🔥 2회 실패 시 fallback 대화 흐름
          await speechEngine.speak("이메일 형식이 올바르지 않습니다. 중단하시겠습니까? 중단하려면 '중단'이라고 말씀해주세요.");
          const response = await speechEngine.listenOnce("command");
          if (response.includes("중단") || response.includes("취소")) {
            await speechEngine.speak("이메일 입력을 중단했습니다.");
            emailRetryCountRef.current = 0;
            return;
          }
          // 계속 시도
          await speechEngine.speak("다시 시도하겠습니다. 이메일을 말씀해주세요.");
          setTimeout(() => {
            startEmailFieldVoice();
          }, 500);
        } else {
          // 🔥 3회 실패 후 최종 탈출
          await speechEngine.speak("음성 인식이 잘 되지 않아, 직접 입력으로 전환해주세요.");
          emailRetryCountRef.current = 0;
        }
        return;
      }

      // 🔥 성공 시 재시도 카운터 리셋
      emailRetryCountRef.current = 0;
      setEmail(parsed.email);
      await speechEngine.speak("이메일이 입력되었습니다. 다음으로 비밀번호를 입력해주세요.");
      // 🔥 자동으로 비밀번호 입력 단계로 전환 (아키텍처 요구사항)
      if (options.onEmailComplete) {
        setTimeout(() => {
          options.onEmailComplete?.();
        }, 500);
      }
    } catch (e) {
      console.error("[VoiceSignupFields] 이메일 입력 오류:", e);
      await speechEngine.speak("이메일 입력 중 오류가 발생했습니다.");
      emailRetryCountRef.current = 0; // 에러 시 리셋
    }
  }, [options]);

  /**
   * 비밀번호 필드 음성 입력 시작
   * 🔥 3회 실패 후 탈출 로직 + 숫자만 필터링
   */
  const passwordRetryCountRef = useRef(0);
  const MAX_PASSWORD_RETRY = 3;

  const startPasswordFieldVoice = useCallback(async () => {
    try {
      // 🔥 단계 전환 시 STT 정지 후 TTS 시작
      speechEngine.stopSTT();
      
      const text = await speechEngine.listenOnce("field");
      console.log("[VoiceSignupFields] 비밀번호 인식:", text);

      if (!text) {
        passwordRetryCountRef.current++;
        if (passwordRetryCountRef.current < MAX_PASSWORD_RETRY) {
          await speechEngine.speak("비밀번호를 잘 이해하지 못했습니다. 다시 말씀해주세요.");
          setTimeout(() => {
            startPasswordFieldVoice();
          }, 500);
        } else {
          await speechEngine.speak("음성 인식이 잘 되지 않아, 직접 입력으로 전환해주세요.");
          passwordRetryCountRef.current = 0;
        }
        return;
      }

      const fixed = parsePassword(text);
      
      // 🔥 숫자만 필터링 (강력 파서 적용)
      const digits = fixed.replace(/[^0-9]/g, "");
      if (!digits || digits.length < 4) {
        passwordRetryCountRef.current++;
        if (passwordRetryCountRef.current < MAX_PASSWORD_RETRY) {
          await speechEngine.speak("비밀번호는 최소 4자리 숫자로 말해주세요.");
          setTimeout(() => {
            startPasswordFieldVoice();
          }, 500);
        } else {
          await speechEngine.speak("음성 인식이 잘 되지 않아, 직접 입력으로 전환해주세요.");
          passwordRetryCountRef.current = 0;
        }
        return;
      }

      // 🔥 성공 시 재시도 카운터 리셋
      passwordRetryCountRef.current = 0;
      setPassword(digits);
      await speechEngine.speak("비밀번호가 입력되었습니다. 다음으로 비밀번호 확인을 입력해주세요.");
      // 🔥 자동으로 비밀번호 확인 단계로 전환 (아키텍처 요구사항)
      if (options.onPasswordComplete) {
        setTimeout(() => {
          options.onPasswordComplete?.();
        }, 500);
      }
    } catch (e) {
      console.error("[VoiceSignupFields] 비밀번호 입력 오류:", e);
      await speechEngine.speak("비밀번호 입력 중 오류가 발생했습니다.");
      passwordRetryCountRef.current = 0;
    }
  }, [options]);

  /**
   * 비밀번호 확인 필드 음성 입력 시작
   * 🔥 비밀번호 일치 검증 포함 + 3회 실패 후 탈출
   */
  const confirmRetryCountRef = useRef(0);
  const MAX_CONFIRM_RETRY = 3;

  const startConfirmFieldVoice = useCallback(async () => {
    // 🔥 password 최신값 확인을 위해 ref 사용
    try {
      // 🔥 단계 전환 시 STT 정지 후 TTS 시작
      speechEngine.stopSTT();
      
      const text = await speechEngine.listenOnce("field");
      console.log("[VoiceSignupFields] 비밀번호 확인 인식:", text);

      if (!text) {
        confirmRetryCountRef.current++;
        if (confirmRetryCountRef.current < MAX_CONFIRM_RETRY) {
          await speechEngine.speak("비밀번호 확인을 잘 이해하지 못했습니다. 다시 말씀해주세요.");
          setTimeout(() => {
            startConfirmFieldVoice();
          }, 500);
        } else {
          await speechEngine.speak("음성 인식이 잘 되지 않아, 직접 입력으로 전환해주세요.");
          confirmRetryCountRef.current = 0;
        }
        return;
      }

      const fixed = parsePassword(text);
      
      // 🔥 숫자만 필터링 (강력 파서 적용)
      const digits = fixed.replace(/[^0-9]/g, "");
      if (!digits || digits.length < 4) {
        confirmRetryCountRef.current++;
        if (confirmRetryCountRef.current < MAX_CONFIRM_RETRY) {
          await speechEngine.speak("비밀번호 확인은 최소 4자리 숫자로 말해주세요.");
          setTimeout(() => {
            startConfirmFieldVoice();
          }, 500);
        } else {
          await speechEngine.speak("음성 인식이 잘 되지 않아, 직접 입력으로 전환해주세요.");
          confirmRetryCountRef.current = 0;
        }
        return;
      }

      setConfirmPassword(digits);

      // 🔥 비밀번호 일치 검증 (passwordRef를 통해 최신값 확인)
      if (passwordRef.current === digits) {
        // 비밀번호 일치
        confirmRetryCountRef.current = 0; // 성공 시 리셋
        await speechEngine.speak("비밀번호가 확인되었습니다. 가입하기 라고 말씀하시면 회원가입을 진행합니다.");
      } else {
        // 비밀번호 불일치
        confirmRetryCountRef.current++;
        if (confirmRetryCountRef.current < MAX_CONFIRM_RETRY) {
          await speechEngine.speak("비밀번호가 일치하지 않습니다. 다시 한 번 말씀해주세요.");
          setTimeout(() => {
            startConfirmFieldVoice();
          }, 500);
        } else {
          await speechEngine.speak("비밀번호 확인에 실패했습니다. 직접 입력으로 전환해주세요.");
          confirmRetryCountRef.current = 0;
        }
      }
    } catch (e) {
      console.error("[VoiceSignupFields] 비밀번호 확인 입력 오류:", e);
      await speechEngine.speak("비밀번호 확인 입력 중 오류가 발생했습니다.");
      confirmRetryCountRef.current = 0;
    }
  }, [options]);

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    startEmailFieldVoice,
    startPasswordFieldVoice,
    startConfirmFieldVoice,
  };
}

