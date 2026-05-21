// src/voice/useVoiceLoginFields.ts
// 🔥 로그인 필드 음성 입력 훅 (v2 안정화 버전)

import { useState, useCallback, useRef } from "react";
import { speechEngine } from "./speechEngine";
import { parseFullEmail } from "./parseFullEmail";
import { parsePassword } from "./parsePassword";

export function useVoiceLoginFields() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      
      // 🔥 재시도 카운터 초기화 (새로운 입력 시작 시)
      emailRetryCountRef.current = 0;

      const text = await speechEngine.listenOnce("field");
      console.log("[VoiceLoginFields] 이메일 인식:", text);

      if (!text || text.length < 5) {
        emailRetryCountRef.current++;
        if (emailRetryCountRef.current < MAX_RETRY) {
          await speechEngine.speak("이메일을 잘 이해하지 못했습니다. 다시 한 번 말씀해주세요.");
          setTimeout(() => {
            startEmailFieldVoice();
          }, 500);
        } else {
          // 🔥 3회 실패 후 탈출
          await speechEngine.speak("음성 인식이 잘 되지 않아, 직접 입력으로 전환해주세요.");
          emailRetryCountRef.current = 0;
        }
        return;
      }

      const parsed = parseFullEmail(text);
      if (!parsed) {
        emailRetryCountRef.current++;
        if (emailRetryCountRef.current < MAX_RETRY) {
          await speechEngine.speak("이메일 형식을 이해하지 못했습니다. 다시 한 번 말씀해주세요.");
          setTimeout(() => {
            startEmailFieldVoice();
          }, 500);
        } else {
          // 🔥 3회 실패 후 탈출
          await speechEngine.speak("음성 인식이 잘 되지 않아, 직접 입력으로 전환해주세요.");
          emailRetryCountRef.current = 0;
        }
        return;
      }

      // 🔥 성공 시 재시도 카운터 리셋
      emailRetryCountRef.current = 0;
      setEmail(parsed.email);
      await speechEngine.speak("입력이 완료되었습니다. 다음은 비밀번호를 입력할 수 있습니다. 무엇을 하시겠어요?");
    } catch (e) {
      console.error("[VoiceLoginFields] 이메일 입력 오류:", e);
      await speechEngine.speak("이메일 입력 중 오류가 발생했습니다.");
      emailRetryCountRef.current = 0;
    }
  }, []);

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
      console.log("[VoiceLoginFields] 비밀번호 인식:", text);

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
      await speechEngine.speak("비밀번호가 입력되었습니다. 계속하시려면 로그인이라고 말씀해주세요.");
    } catch (e) {
      console.error("[VoiceLoginFields] 비밀번호 입력 오류:", e);
      await speechEngine.speak("비밀번호 입력 중 오류가 발생했습니다.");
      passwordRetryCountRef.current = 0;
    }
  }, []);

  return {
    email,
    setEmail,
    password,
    setPassword,
    startEmailFieldVoice,
    startPasswordFieldVoice,
  };
}

