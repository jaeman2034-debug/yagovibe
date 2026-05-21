// src/voice/usePhoneLoginVoiceFlow.ts
// 🔥 전화번호 로그인 페이지용 음성 명령 흐름 훅 (3단계 상태 머신)

import { useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { speechEngine } from "./speechEngine";
import {
  parsePhoneLoginIntent,
  type PhoneLoginIntent,
  type PhoneLoginState,
} from "./parsePhoneLoginIntent";
import { parsePhoneNumber } from "./parsePhoneNumber";

interface Options {
  onPhoneInputVoice?: () => void; // 전화번호 필드 음성 입력 (deprecated - state 기반으로 대체)
  onSendCode?: () => Promise<void> | void; // 인증번호 받기
  onVerifyCodeInputVoice?: (code: string) => void | (() => void); // 인증번호 필드 음성 입력 (인증번호 전달)
  onGoBack?: () => void; // 뒤로 가기
  onHome?: () => void; // 홈으로
  onResetPhone?: () => void; // 전화번호 초기화
  // 🔥 새로운 콜백: 전화번호 업데이트
  onPhoneUpdate?: (phone: string) => void; // 전화번호 업데이트 콜백
  // 🔥 현재 전화번호 상태 확인용
  getCurrentPhone?: () => string; // 현재 전화번호 가져오기
  // 🔥 인증번호 전송 완료 후 상태 전환 콜백
  onSendCodeComplete?: () => void; // 인증번호 전송 완료 후 호출 (상태 전환용)
}

export const usePhoneLoginVoiceFlow = (opts: Options) => {
  const navigate = useNavigate();
  
  // 🔥 상태 머신
  const [state, setState] = useState<PhoneLoginState>("idle");
  const phoneNumberRef = useRef<string>(""); // 전화번호 누적 저장

  // 🔥 파서에 전달할 상태 변환 함수 (PhoneLoginState 반환)
  const getParserState = useCallback((): PhoneLoginState => {
    // state는 이미 PhoneLoginState 타입이므로 그대로 반환
    return state;
  }, [state]);

  // 🔥 전화번호 업데이트 헬퍼
  const updatePhone = useCallback((newPhone: string) => {
    phoneNumberRef.current = newPhone;
    opts.onPhoneUpdate?.(newPhone);
  }, [opts]);

  // 🔥 숫자만 추출 (한국어 숫자 → 아라비아 숫자)
  const extractDigitsFromKorean = useCallback((text: string): string => {
    return parsePhoneNumber(text);
  }, []);

  // 🔥 명령 모드 시작 함수 (참조용)
  const startVoiceCommandRef = useRef<(() => Promise<void>) | null>(null);
  const handlePhoneDigitsRef = useRef<(() => Promise<void>) | null>(null);
  const handleVerifyCodeInputRef = useRef<(() => Promise<void>) | null>(null);

  // 🔥 4단계: waiting_code 상태 - 인증번호 입력 (먼저 정의하여 다른 함수에서 참조 가능하도록)
  // 🔥 재시도 횟수 추적 (무한 루프 방지)
  const verifyCodeRetryCountRef = useRef(0);
  const MAX_VERIFY_CODE_RETRIES = 3; // 최대 3회 재시도

  const handleVerifyCodeInput = useCallback(async () => {
    console.log("[PhoneLogin][waiting_code] 인증번호 입력 시작 (mode: field, 재시도:", verifyCodeRetryCountRef.current, "/", MAX_VERIFY_CODE_RETRIES, ")");
    
    // 🔥 재시도 횟수 초과 시 음성 입력 포기 안내
    if (verifyCodeRetryCountRef.current >= MAX_VERIFY_CODE_RETRIES) {
      console.log("[PhoneLogin][waiting_code] 재시도 횟수 초과 → 음성 입력 포기");
      verifyCodeRetryCountRef.current = 0; // 리셋
      await speechEngine.safeSpeak(
        "음성 인식이 원활하지 않습니다. 화면의 입력란에 직접 입력하거나, 마이크 버튼을 다시 눌러 재시도해주세요.",
        () => {
          // 🔥 명령 모드로 전환하여 사용자가 선택할 수 있도록
          setTimeout(() => {
            startVoiceCommandRef.current?.();
          }, 500);
        }
      );
      return;
    }
    
    // 🔥 mode: field로 숫자만 듣기 (인텐트 파싱 금지!)
    const text = await speechEngine.listenOnce("field");
    console.log("[PhoneLogin][waiting_code] 인식 결과:", text);

    // 🔥 빈 결과 처리 (재시도 횟수 증가)
    if (!text || !text.trim()) {
      verifyCodeRetryCountRef.current++;
      console.log("[PhoneLogin][waiting_code] 빈 결과 → 재시도", verifyCodeRetryCountRef.current, "/", MAX_VERIFY_CODE_RETRIES);
      
      await speechEngine.safeSpeak(
        "인증번호를 잘 이해하지 못했습니다. 6자리 숫자를 명확하게 말씀해주세요.",
        () => {
          setTimeout(() => {
            // 🔥 ref를 통해 재귀 호출 (안전하게)
            handleVerifyCodeInputRef.current?.(); // 다시 숫자 듣기
          }, 500); // 🔥 지연 시간 증가 (PC 환경 대응)
        }
      );
      return;
    }

    // 🔥 숫자 추출 (한국어/영어 숫자 단어 포함)
    const { extractDigits } = await import("@/voice/extractDigits");
    const digits = extractDigits(text);
    console.log("[PhoneLogin][waiting_code] 추출된 숫자:", digits);

    // 🔥 숫자 추출 실패 시 재시도
    if (!digits || digits.length === 0) {
      verifyCodeRetryCountRef.current++;
      console.log("[PhoneLogin][waiting_code] 숫자 추출 실패 → 재시도", verifyCodeRetryCountRef.current, "/", MAX_VERIFY_CODE_RETRIES);
      
      await speechEngine.safeSpeak(
        "숫자를 인식하지 못했습니다. 예를 들어 '일 이 삼 사 오 육' 또는 '123456'처럼 말씀해주세요.",
        () => {
          setTimeout(() => {
            handleVerifyCodeInputRef.current?.(); // 다시 숫자 듣기
          }, 500);
        }
      );
      return;
    }

    // 🔥 인증번호는 4~6자리
    if (digits.length < 4 || digits.length > 6) {
      verifyCodeRetryCountRef.current++;
      console.log("[PhoneLogin][waiting_code] 길이 불일치 (", digits.length, "자리) → 재시도", verifyCodeRetryCountRef.current, "/", MAX_VERIFY_CODE_RETRIES);
      
      await speechEngine.safeSpeak(
        `인증번호는 4자리에서 6자리 사이여야 합니다. 현재 ${digits.length}자리입니다. 6자리 숫자를 다시 말씀해주세요.`,
        () => {
          setTimeout(() => {
            handleVerifyCodeInputRef.current?.(); // 다시 숫자 듣기
          }, 500);
        }
      );
      return;
    }

    // 🔥 성공 시 재시도 횟수 리셋
    verifyCodeRetryCountRef.current = 0;

    // 🔥 인증번호 입력 완료 → 콜백 호출
    await speechEngine.speak(`인증번호 ${digits.length}자리를 입력했습니다.`);
    
    // 🔥 콜백이 있으면 인증번호를 전달 (PhoneLoginPage에서 setCode + 자동 검증)
    if (opts.onVerifyCodeInputVoice) {
      // 🔥 콜백 시그니처 확인: (code: string) => void | Promise<void> 또는 () => void
      try {
        const result = (opts.onVerifyCodeInputVoice as any)(digits);
        // 🔥 Promise인 경우 await (자동 검증 로직이 포함될 수 있음)
        if (result && typeof result.then === "function") {
          await result;
          console.log("[PhoneLogin][waiting_code] 인증번호 검증 완료");
        }
      } catch (error) {
        console.error("[PhoneLogin] onVerifyCodeInputVoice 콜백 오류:", error);
        // 🔥 검증 실패 시 재시도 횟수는 유지 (검증 실패는 음성 인식 문제가 아님)
        await speechEngine.safeSpeak(
          "인증번호 검증 중 오류가 발생했습니다. 다시 말씀해주세요.",
          () => {
            setTimeout(() => {
              handleVerifyCodeInputRef.current?.(); // 다시 숫자 듣기
            }, 500);
          }
        );
      }
    }
  }, [opts]);

  // 🔥 handleVerifyCodeInput 참조 업데이트
  handleVerifyCodeInputRef.current = handleVerifyCodeInput;

  // 🔥 1단계: idle 상태 - 명령 안내
  const handleIdleCommand = useCallback(
    async (intent: PhoneLoginIntent) => {
      console.log("[PhoneLogin][idle] 인텐트:", intent);

      switch (intent) {
        case "start_phone_input":
          setState("phone_input");
          await speechEngine.safeSpeak(
            "휴대폰 번호를 말씀해주세요. 숫자만 이어서 말하셔도 됩니다.",
            () => {
              setTimeout(() => {
                handlePhoneDigitsRef.current?.(); // 숫자 입력 시작
              }, 300);
            }
          );
          return;

        case "send_code":
          // 🔥 전화번호 길이 확인
          const currentPhone = opts.getCurrentPhone?.() || phoneNumberRef.current;
          if (!currentPhone || currentPhone.length < 10) {
            await speechEngine.safeSpeak(
              "전화번호가 아직 완성되지 않았습니다. 먼저 번호를 말씀해주세요.",
              () => {
                setTimeout(() => {
                  // 🔥 startVoiceCommandRef를 통해 호출 (의존성 문제 해결)
                  startVoiceCommandRef.current?.();
                }, 300);
              }
            );
            return;
          }

          // 🔥 인증번호 전송
          speechEngine.stopSTT(); // 🔥 STT 완전 종료
          await new Promise((resolve) => setTimeout(resolve, 300)); // TTS-STT 충돌 방지
          await speechEngine.speak("인증번호를 전송합니다.");
          await opts.onSendCode?.();
          
          // 🔥 핵심: send_code 후 waiting_code 상태로 전환
          setState("waiting_code");
          speechEngine.stopSTT(); // 🔥 추가 안전장치: STT 완전 종료
          console.log("[PhoneLogin][idle] send_code 완료 → waiting_code 상태로 전환");
          
          // 🔥 waiting_code 모드로 전환 후 인증번호 입력 안내 + STT field 모드 자동 시작
          await speechEngine.safeSpeak(
            "인증번호를 전송했습니다. 휴대폰으로 받은 6자리 숫자를 순서대로 말씀해주세요.",
            () => {
              setTimeout(() => {
                console.log("[PhoneLogin][waiting_code] 인증번호 입력을 위한 field 모드 STT 자동 시작");
                // 🔥 ref를 통해 안전하게 호출 (초기화 전 접근 방지)
                handleVerifyCodeInputRef.current?.(); // 🔥 인증번호 입력 field 모드 자동 시작
              }, 300);
            }
          );
          return;

        case "email_login":
          speechEngine.stopSTT();
          await speechEngine.speak("이메일 로그인 페이지로 이동합니다.");
          navigate("/login");
          return;

        case "back":
          speechEngine.stopSTT();
          await speechEngine.speak("뒤로 이동합니다.");
          opts.onGoBack?.();
          return;

        case "go_home":
          speechEngine.stopSTT();
          await speechEngine.speak("홈으로 이동합니다.");
          navigate("/start");
          return;

        default:
          await speechEngine.speak(
            "이 페이지에서는 사용할 수 없는 명령입니다. 전화번호 입력, 인증번호 받기, 이메일 로그인, 뒤로가기, 홈으로 중 하나를 말씀해주세요."
          );
          return;
      }
    },
    [navigate, opts]
  );

  // 🔥 2단계: phone_input 상태 - 숫자 입력
  const handlePhoneDigits = useCallback(async () => {
    console.log("[PhoneLogin][phone_input] 숫자 입력 시작 (mode: field)");
    
    // 🔥 mode: field로 숫자만 듣기 (인텐트 파싱 금지!)
    const text = await speechEngine.listenOnce("field");
    console.log("[PhoneLogin][phone_input] 인식 결과:", text);

    if (!text || !text.trim()) {
      await speechEngine.safeSpeak(
        "번호를 잘 이해하지 못했습니다. 다시 한번 말씀해주세요.",
        () => {
          setTimeout(() => {
            handlePhoneDigits(); // 다시 숫자 듣기
          }, 300);
        }
      );
      return;
    }

    // 🔥 숫자만 추출
    const digits = extractDigitsFromKorean(text);
    console.log("[PhoneLogin][phone_input] 추출된 숫자:", digits);

    if (!digits || digits.length === 0) {
      await speechEngine.safeSpeak(
        "번호를 잘 이해하지 못했습니다. 다시 한번 말씀해주세요.",
        () => {
          setTimeout(() => {
            handlePhoneDigits(); // 다시 숫자 듣기
          }, 300);
        }
      );
      return;
    }

    // 🔥 누적 모드: 기존 입력값 뒤에 이어붙이기 (최대 11자리)
    const currentPhone = phoneNumberRef.current;
    const newPhone = (currentPhone + digits).slice(0, 11);
    updatePhone(newPhone);
    console.log("[PhoneLogin][phone_input] 누적 전화번호:", newPhone, "(이전:", currentPhone, "+ 새로:", digits, ")");

    if (newPhone.length < 10) {
      // 🔥 아직 부족 → 계속 숫자 듣기
      await speechEngine.safeSpeak(
        `현재 ${newPhone.length}자리까지 입력되었습니다. 번호가 더 남았으면 계속 말씀해주세요. 다 입력하셨으면, 인증번호 받기라고 말씀해주세요.`,
        () => {
          setTimeout(() => {
            handlePhoneDigits(); // 계속 숫자 듣기 (mode: field)
          }, 300);
        }
      );
    } else {
      // 🔥 길이 충분 → waiting_send 상태로 전환
      setState("waiting_send");
      console.log("[PhoneLogin][phone_input] 전화번호 입력 완료 → waiting_send 상태로 전환");
      
      await speechEngine.safeSpeak(
        `전화번호 입력이 완료되었습니다. 입력하신 번호는 ${newPhone}입니다. 인증번호를 받고 싶으시면 인증번호 받기라고 말씀해주세요.`,
        () => {
          setTimeout(async () => {
            // 🔥 핵심: setState는 비동기이므로, 명시적으로 "waiting_send" 상태로 처리
            // startVoiceCommand를 직접 호출하지 않고, waiting_send 상태 처리 로직을 직접 실행
            console.log("[PhoneLogin][phone_input] waiting_send 상태로 명령 모드 시작");
            
            const promptText =
              "전화번호 입력이 완료되었습니다. 인증번호를 받고 싶으시면 인증번호 받기라고 말씀해주세요. 번호를 다시 입력하시려면 전화번호 입력이라고 말씀해주세요.";
            
            // 🔥 TTS → STT (mode: command)
            const heard = await speechEngine.promptAndListen(promptText, "command");
            console.log("[PhoneLogin][waiting_send] heard:", heard);

            // 🔥 숫자만 입력된 경우 명령으로 오해하지 않음
            if (/^\d+$/.test(heard.trim())) {
              console.log("[PhoneLogin][waiting_send] 숫자만 입력됨 → 명령으로 오해하지 않음:", heard);
              await speechEngine.speak("인증번호 받기 또는 전화번호 입력이라고 말씀해주세요.");
              setTimeout(() => {
                startVoiceCommandRef.current?.();
              }, 500);
              return;
            }

            // 🔥 전화번호 로그인 전용 인텐트 파서 사용 (상태: waiting_send)
            const intent = parsePhoneLoginIntent(heard, "waiting_send");
            console.log("[PhoneLogin][waiting_send] intent:", intent, "(state: waiting_send)");
            await handleWaitingSendCommand(intent);
          }, 300);
        }
      );
    }
  }, [extractDigitsFromKorean, updatePhone]);

  // 🔥 handlePhoneDigits 참조 업데이트
  handlePhoneDigitsRef.current = handlePhoneDigits;

  // 🔥 3단계: waiting_send 상태 - 인증번호 받기 명령만 대기
  const handleWaitingSendCommand = useCallback(
    async (intent: PhoneLoginIntent) => {
      console.log("[PhoneLogin][waiting_send] 인텐트:", intent);

      switch (intent) {
        case "send_code":
          // 🔥 인증번호 전송
          speechEngine.stopSTT(); // 🔥 STT 완전 종료
          await new Promise((resolve) => setTimeout(resolve, 300)); // TTS-STT 충돌 방지
          await speechEngine.speak("인증번호를 전송합니다.");
          await opts.onSendCode?.();
          
          // 🔥 핵심: send_code 후 waiting_code 상태로 전환
          setState("waiting_code");
          speechEngine.stopSTT(); // 🔥 추가 안전장치: STT 완전 종료
          console.log("[PhoneLogin][waiting_send] send_code 완료 → waiting_code 상태로 전환");
          
          // 🔥 waiting_code 모드로 전환 후 인증번호 입력 안내 + STT field 모드 자동 시작
          await speechEngine.safeSpeak(
            "인증번호를 전송했습니다. 휴대폰으로 받은 6자리 숫자를 순서대로 말씀해주세요.",
            () => {
              setTimeout(() => {
                console.log("[PhoneLogin][waiting_code] 인증번호 입력을 위한 field 모드 STT 자동 시작");
                // 🔥 ref를 통해 안전하게 호출 (초기화 전 접근 방지)
                handleVerifyCodeInputRef.current?.(); // 🔥 인증번호 입력 field 모드 자동 시작
              }, 300);
            }
          );
          return;

        case "start_phone_input":
          // 🔥 번호 다시 입력
          setState("phone_input");
          await speechEngine.safeSpeak(
            "번호를 다시 말씀해주세요. 기존 번호 뒤에 이어서 말씀하셔도 됩니다.",
            () => {
              setTimeout(() => {
                handlePhoneDigitsRef.current?.(); // 숫자 입력 시작
              }, 300);
            }
          );
          return;

        case "email_login":
          speechEngine.stopSTT();
          await speechEngine.speak("이메일 로그인 페이지로 이동합니다.");
          navigate("/login");
          return;

        case "back":
          speechEngine.stopSTT();
          await speechEngine.speak("뒤로 이동합니다.");
          opts.onGoBack?.();
          return;

        case "go_home":
          speechEngine.stopSTT();
          await speechEngine.speak("홈으로 이동합니다.");
          navigate("/start");
          return;

        default:
          await speechEngine.speak(
            "인증번호 받기, 전화번호 입력, 이메일 로그인, 뒤로가기, 홈으로 중 하나를 말씀해주세요."
          );
          return;
      }
    },
    [navigate, opts]
  );

  // 🔥 waiting_code 상태에서 인증번호 입력 처리
  const handleVerifyCodeCommand = useCallback(
    async (intent: PhoneLoginIntent) => {
      console.log("[PhoneLogin][waiting_code] 인텐트:", intent);

      switch (intent) {
        case "start_code_input":
        case "start_phone_input": // "인증번호 입력"이 phone_input으로 인식될 수 있음
          // 🔥 ref를 통해 안전하게 호출 (초기화 전 접근 방지)
          if (handleVerifyCodeInputRef.current) {
            await handleVerifyCodeInputRef.current();
          }
          return;

        case "email_login":
          speechEngine.stopSTT();
          await speechEngine.speak("이메일 로그인 페이지로 이동합니다.");
          navigate("/login");
          return;

        case "back":
          speechEngine.stopSTT();
          await speechEngine.speak("뒤로 이동합니다.");
          opts.onGoBack?.();
          return;

        case "go_home":
          speechEngine.stopSTT();
          await speechEngine.speak("홈으로 이동합니다.");
          navigate("/start");
          return;

        default:
          await speechEngine.speak(
            "인증번호 입력, 이메일 로그인, 뒤로가기, 홈으로 중 하나를 말씀해주세요."
          );
          return;
      }
    },
    [navigate, opts]
  );

  // 🔥 명령 모드 시작 (idle, waiting_send, waiting_code 상태)
  const startVoiceCommand = useCallback(async () => {
    // 🔥 현재 상태를 다시 읽어서 최신 상태 확인
    const currentState = state;
    console.log("[PhoneLogin] state:", currentState, "→ 명령 모드 시작");

    // 🔥 phone_input 상태에서는 명령 모드로 들어오지 않음 (먼저 체크)
    if (currentState === "phone_input") {
      console.log("[PhoneLogin] ⚠️ phone_input 상태에서는 명령 모드로 들어오지 않음 - handlePhoneDigits를 호출해야 함");
      return;
    }

    // 🔥 waiting_code 상태에서는 인증번호 입력만 허용
    if (currentState === "waiting_code") {
      const promptText = "인증번호 입력이라고 말씀해주시면 인증번호를 음성으로 입력할 수 있습니다.";
      const heard = await speechEngine.promptAndListen(promptText, "command");
      console.log("[PhoneLogin][waiting_code] heard:", heard);
      
      const intent = parsePhoneLoginIntent(heard, getParserState());
      console.log("[PhoneLogin][waiting_code] intent:", intent);
      
      if (intent === "start_code_input" || intent === "start_phone_input") {
        // 🔥 인증번호 입력 모드로 전환 (ref를 통해 안전하게 호출)
        if (handleVerifyCodeInputRef.current) {
          await handleVerifyCodeInputRef.current();
        }
      } else if (intent === "email_login") {
        speechEngine.stopSTT();
        await speechEngine.speak("이메일 로그인 페이지로 이동합니다.");
        navigate("/login");
      } else if (intent === "back") {
        speechEngine.stopSTT();
        await speechEngine.speak("뒤로 이동합니다.");
        opts.onGoBack?.();
      } else if (intent === "go_home") {
        speechEngine.stopSTT();
        await speechEngine.speak("홈으로 이동합니다.");
        navigate("/start");
      } else {
        // 🔥 숫자만 입력된 경우 명령으로 오해하지 않음
        if (/^\d+$/.test(heard.trim())) {
          await speechEngine.speak("인증번호 입력이라고 말씀해주세요.");
          return;
        }
        await speechEngine.speak("인증번호 입력, 이메일 로그인, 뒤로가기, 홈으로 중 하나를 말씀해주세요.");
      }
      return;
    }

    // 🔥 상태에 따른 안내 메시지 및 처리
    if (currentState === "idle") {
      const promptText =
        "여기는 전화번호 로그인입니다. 전화번호 입력, 인증번호 받기, 인증번호 입력 중 하나를 말씀해주세요.";
      
      // 🔥 TTS → STT (mode: command)
      const heard = await speechEngine.promptAndListen(promptText, "command");
      console.log("[PhoneLogin][idle] heard:", heard);

      // 🔥 숫자만 입력된 경우 명령으로 오해하지 않음
      if (/^\d+$/.test(heard.trim())) {
        console.log("[PhoneLogin][idle] 숫자만 입력됨 → 명령으로 오해하지 않음:", heard);
        await speechEngine.speak("명령을 말씀해주세요. 전화번호 입력, 인증번호 받기 등 중 하나를 말씀해주세요.");
        setTimeout(() => {
          startVoiceCommand();
        }, 500);
        return;
      }

      // 🔥 전화번호 로그인 전용 인텐트 파서 사용 (상태 전달)
      const intent = parsePhoneLoginIntent(heard, getParserState());
      console.log("[PhoneLogin][idle] intent:", intent, "(state:", currentState, ")");
      await handleIdleCommand(intent);
      
    } else if (currentState === "waiting_send") {
      // 🔥 waiting_send 상태: "인증번호 받기" 또는 "전화번호 다시"만 안내
      const promptText =
        "전화번호 입력이 완료되었습니다. 인증번호를 받고 싶으시면 인증번호 받기라고 말씀해주세요. 번호를 다시 입력하시려면 전화번호 입력이라고 말씀해주세요.";
      
      // 🔥 TTS → STT (mode: command)
      const heard = await speechEngine.promptAndListen(promptText, "command");
      console.log("[PhoneLogin][waiting_send] heard:", heard);

      // 🔥 숫자만 입력된 경우 명령으로 오해하지 않음
      if (/^\d+$/.test(heard.trim())) {
        console.log("[PhoneLogin][waiting_send] 숫자만 입력됨 → 명령으로 오해하지 않음:", heard);
        await speechEngine.speak("인증번호 받기 또는 전화번호 입력이라고 말씀해주세요.");
        setTimeout(() => {
          startVoiceCommand();
        }, 500);
        return;
      }

      // 🔥 전화번호 로그인 전용 인텐트 파서 사용 (상태 전달)
      const intent = parsePhoneLoginIntent(heard, getParserState());
      console.log("[PhoneLogin][waiting_send] intent:", intent, "(state:", currentState, ")");
      await handleWaitingSendCommand(intent);
      
    } else {
      // 🔥 예상치 못한 상태
      console.log("[PhoneLogin] ⚠️ 예상치 못한 상태:", currentState);
      return;
    }
  }, [state, handleIdleCommand, handleWaitingSendCommand, handleVerifyCodeCommand, getParserState, navigate, opts]);

  // 🔥 startVoiceCommand 참조 업데이트
  startVoiceCommandRef.current = startVoiceCommand;

  // 🔥 전화번호 초기화
  const resetPhone = useCallback(() => {
    phoneNumberRef.current = "";
    updatePhone("");
    setState("idle");
    opts.onResetPhone?.();
  }, [updatePhone, opts]);

  // 🔥 외부에서 상태를 설정할 수 있는 함수 (버튼 클릭 등에서 사용)
  const setStateExternal = useCallback((newState: PhoneLoginState) => {
    console.log("[PhoneLogin] 외부에서 상태 전환:", state, "→", newState);
    setState(newState);
    speechEngine.stopSTT(); // 🔥 상태 전환 시 STT 완전 종료
  }, [state]);

  // 🔥 인증번호 입력 모드 시작 함수 (외부에서 직접 호출 가능)
  const startVerifyCodeInput = useCallback(async () => {
    console.log("[PhoneLogin] 외부에서 인증번호 입력 모드 시작");
    if (handleVerifyCodeInputRef.current) {
      await handleVerifyCodeInputRef.current();
    }
  }, []);

  return {
    startVoiceCommand,
    resetPhone,
    currentState: state,
    currentPhone: phoneNumberRef.current,
    setState: setStateExternal, // 🔥 외부에서 상태 설정 가능
    startVerifyCodeInput, // 🔥 인증번호 입력 모드 직접 시작
  };
};
