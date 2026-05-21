// src/voice/speechEngine.ts
// 🔥 브라우저 전역 음성 엔진 (TTS + STT) 안정화 버전 v2

import { isMobileDevice } from "@/utils/deviceDetection";

type STTMode = "command" | "field";

class SpeechEngine {
  private static _instance: SpeechEngine | null = null;

  static get instance() {
    if (!this._instance) this._instance = new SpeechEngine();
    return this._instance;
  }

  // STT
  private recognition: SpeechRecognition | null = null;
  private sttRunning = false;
  private sttMode: STTMode = "command";

  // TTS
  private ttsPlaying = false;
  private ttsQueue: string[] = [];
  private isProcessingQueue = false;

  private constructor() {
    const AnyWin = window as any;
    const SpeechRec = AnyWin.SpeechRecognition || AnyWin.webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn("[speech] STT 미지원 브라우저");
      return;
    }

    this.recognition = new SpeechRec();
    this.recognition.lang = "ko-KR";
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    // 🔥 PC 환경 최적화: maxAlternatives 설정 (여러 후보 결과 받기)
    if ("maxAlternatives" in this.recognition) {
      (this.recognition as any).maxAlternatives = 3;
    }
  }

  // 🔊 TTS: 안전하게 한 번만 재생 (기존 것 강제 중단 + 완료까지 대기)
  // 🔥 TTS 중복 실행 방지: speak() 호출 전 반드시 stop + await 처리
  async speak(text: string): Promise<void> {
    if (!text) return;
    
    // 🔥 1. 이전 TTS 완전 정지 (필수!)
    // 🔒 모바일 브라우저에서 speechSynthesis가 없을 수 있음
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("[speech] speechSynthesis.cancel() 실패:", e);
      }
    }
    
    // 🔥 2. STT가 돌고 있으면 먼저 끄기
    this.stopSTT();
    
    // 🔥 3. 현재 재생 중인 TTS가 있으면 완료까지 대기
    while (this.ttsPlaying || this.isProcessingQueue) {
      await new Promise((r) => setTimeout(r, 100));
    }
    
    // 🔥 4. 추가 안전 지연 (브라우저 정리 시간)
    await new Promise((r) => setTimeout(r, 200));
    
    return this.speakQueue(text);
  }

  // 🔥 TTS 큐 시스템: 순차적으로 TTS 재생 (interrupt 방지)
  async speakQueue(text: string): Promise<void> {
    if (!text) return;

    return new Promise((resolve) => {
      // 큐에 추가
      this.ttsQueue.push(text);
      console.log("[speech] TTS 큐에 추가:", text, "(대기 중:", this.ttsQueue.length, "개)");

      // 큐 처리 시작 (이미 처리 중이면 대기)
      this.processQueue().then(() => {
        resolve();
      });
    });
  }

  // 🔥 큐 처리 함수 (내부용)
  private async processQueue(): Promise<void> {
    // 이미 처리 중이면 대기
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.ttsQueue.length > 0) {
      const text = this.ttsQueue.shift();
      if (!text) continue;

      await new Promise<void>((resolve) => {
        try {
          // 🔥 기존 TTS 강제 중단 (안전장치)
          // 🔒 모바일 브라우저에서 speechSynthesis가 없을 수 있음
          if (typeof window !== "undefined" && window.speechSynthesis) {
            try {
              window.speechSynthesis.cancel();
            } catch (e) {
              console.warn("[speech] speechSynthesis.cancel() 실패:", e);
            }
          }
          
          // 🔥 추가 안전 지연
          setTimeout(() => {
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = "ko-KR";
            utter.rate = 1.1;

            this.ttsPlaying = true;
            console.log("[speech] TTS 재생 시작:", text, "(큐 남음:", this.ttsQueue.length, "개)");

            utter.onend = () => {
              console.log("[speech] TTS 재생 완료:", text);
              this.ttsPlaying = false;
              resolve();
            };

            utter.onerror = (e: any) => {
              console.warn("[speech] TTS 오류:", e.error || e);
              this.ttsPlaying = false;
              // interrupted 에러는 정상 종료로 처리
              if (e.error === "interrupted") {
                console.log("[speech] TTS interrupted (정상 종료로 처리)");
              }
              resolve(); // 오류여도 흐름은 계속 가게
            };

            // 🔒 모바일 브라우저에서 speechSynthesis가 없을 수 있음
            if (typeof window !== "undefined" && window.speechSynthesis) {
              window.speechSynthesis.speak(utter);
            } else {
              console.warn("[speech] speechSynthesis를 사용할 수 없습니다.");
              this.ttsPlaying = false;
              resolve();
            }
          }, 100); // 100ms 지연으로 브라우저 정리 시간 확보
        } catch (e) {
          console.warn("[speech] TTS 예외:", e);
          this.ttsPlaying = false;
          resolve();
        }
      });

      // 다음 TTS 전 약간의 지연 (브라우저 정리 시간)
      if (this.ttsQueue.length > 0) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    this.isProcessingQueue = false;
    console.log("[speech] TTS 큐 처리 완료");
  }

  // 🔥 큐 초기화 (페이지 이동 시 등)
  clearQueue() {
    this.ttsQueue = [];
    // 🔒 모바일 브라우저에서 speechSynthesis가 없을 수 있음
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("[speech] speechSynthesis.cancel() 실패:", e);
      }
    }
    this.isProcessingQueue = false;
    this.ttsPlaying = false;
    console.log("[speech] TTS 큐 초기화");
  }

  // 🎤 STT: 한 번만 듣고 문자열 반환 (no-speech 포함)
  async listenOnce(mode: STTMode = "command"): Promise<string> {
    // 🔥 3차 가드: 데스크톱 완전 차단 (STT 엔진 레벨)
    if (!isMobileDevice()) {
      console.info("[speechEngine] Desktop detected → listenOnce 차단 (가드 3)");
      return "";
    }

    const rec = this.recognition;
    if (!rec) {
      console.warn("[speech] STT 인스턴스 없음");
      return "";
    }

    // 🔥 Phase 3-2.5: 로그 레벨 정리 (DEV만 상세 로그)
    if (import.meta.env.DEV) {
      console.log("[Speech] listenOnce 시작 (mode:", mode, ")");
    }

    // 🔥 TTS 완전 종료 확인 (더 강력한 체크)
    let ttsWaitCount = 0;
    const isSpeaking = typeof window !== "undefined" && window.speechSynthesis 
      ? window.speechSynthesis.speaking 
      : false;
    while ((this.ttsPlaying || this.isProcessingQueue || isSpeaking) && ttsWaitCount < 30) {
      await new Promise((r) => setTimeout(r, 100));
      ttsWaitCount++;
    }
    
    // 🔥 혹시 남아있는 TTS 있으면 강제 중단
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("[speech] speechSynthesis.cancel() 실패:", e);
      }
    }

    // 🔥 이미 STT가 돌고 있다면 강제로 정지 후 살짝 쉬고 시작
    if (this.sttRunning) {
      this.stopSTT();
      await new Promise((r) => setTimeout(r, 300)); // 200ms → 300ms로 증가
    }

    this.sttMode = mode;
    this.sttRunning = true;

    return new Promise<string>((resolve) => {
      let finalText = "";
      let hasResolved = false; // 중복 resolve 방지

      rec.onresult = (event: SpeechRecognitionEvent) => {
        finalText = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join(" ")
          .trim();
        // 🔥 Phase 3-2.5: 로그 레벨 정리 (DEV만 transcript 로그)
        if (import.meta.env.DEV) {
          console.log("[Speech] transcript:", finalText);
        }
      };

      rec.onerror = (event: any) => {
        const errorType = event?.error || event;
        
        // 🔥 Phase 3-2.5: 로그 레벨 정리 (DEV만 상세 로그)
        if (import.meta.env.DEV) {
          console.warn("[Speech] STT 에러:", errorType);
        }
        
        // 🔥 Phase 3-2: SpeechManager에 에러 전달 (권한 거부 등)
        if (errorType === "not-allowed" || errorType === "NotAllowedError") {
          // 동적 import로 순환 참조 방지
          import("@/speech/SpeechManager").then(({ speechManager }) => {
            speechManager.setError("마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.", true);
          });
        }
        
        // 🔥 Phase 3-2.5: no-speech 처리 (3초 후 자동 종료 시나리오)
        if (errorType === "no-speech") {
          if (import.meta.env.DEV) {
            console.log("[Speech] no-speech (사용자가 말하지 않음)");
          }
          // no-speech는 정상 종료로 처리 (빈 문자열 반환)
        }
        // 에러여도 onend에서 한번에 정리
      };

      rec.onend = () => {
        if (hasResolved) {
          console.log("[speech] STT onend 중복 호출 방지");
          return;
        }
        
        // 🔥 Phase 3-2.5: 로그 레벨 정리 (DEV만 상세 로그)
        if (import.meta.env.DEV) {
          console.log("[Speech] STT 종료. 결과:", finalText || "(empty)");
        }
        this.sttRunning = false;
        hasResolved = true;
        
        // 이벤트 핸들러 정리
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        
        // no-speech 같은 경우도 그냥 빈 문자열로 resolve
        resolve(finalText);
      };

      try {
        // 기존 STT 정지
        rec.stop();
      } catch {}

      // 🔥 TTS 완전 종료 후 충분한 지연 (no-speech 방지)
      // promptAndListen에서 이미 대기했지만, 추가 안전장치
      setTimeout(() => {
        try {
          // 🔥 TTS가 여전히 재생 중이면 추가 대기
          const isSpeaking = typeof window !== "undefined" && window.speechSynthesis 
            ? window.speechSynthesis.speaking 
            : false;
          if (isSpeaking) {
            console.log("[speech] STT 시작 전 TTS 재생 중 감지 → 추가 대기");
            setTimeout(() => {
              try {
                console.log("[speech] STT 시작 (mode:", mode, ")");
                rec.start();
              } catch (e) {
                console.warn("[speech] STT start 예외:", e);
                this.sttRunning = false;
                rec.onresult = null;
                rec.onerror = null;
                rec.onend = null;
                if (!hasResolved) {
                  hasResolved = true;
                  resolve("");
                }
              }
            }, 300);
          } else {
            console.log("[speech] STT 시작 (mode:", mode, ")");
            rec.start();
          }
        } catch (e) {
          console.warn("[speech] STT start 예외:", e);
          this.sttRunning = false;
          rec.onresult = null;
          rec.onerror = null;
          rec.onend = null;
          if (!hasResolved) {
            hasResolved = true;
            resolve("");
          }
        }
      }, 500); // 500ms 지연으로 no-speech 방지
    });
  }

  // STT 강제 종료 (onend 이벤트는 자동으로 호출됨)
  stopSTT() {
    if (!this.recognition) return;
    if (!this.sttRunning) return;
    try {
      console.log("[speech] STT 강제 stop 호출");
      this.recognition.stop();
    } catch (e) {
      console.warn("[speech] STT stop 예외:", e);
    } finally {
      this.sttRunning = false;
    }
  }

  // 🔥 하드 스톱: STT 완전 종료 (페이지 이동 시 등)
  hardStopSTT() {
    if (!this.recognition) return;
    try {
      // 이벤트 핸들러 제거
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      
      // 강제 종료
      this.recognition.stop();
      console.log("[speech] STT 하드 스톱 완료");
    } catch (e) {
      console.warn("[speech] STT 하드 스톱 예외:", e);
    } finally {
      this.sttRunning = false;
    }
  }

  // 전체 정리 (페이지 언마운트 시 등)
  stopAll() {
    this.hardStopSTT(); // 🔥 하드 스톱 사용
    this.clearQueue();
    console.log("[speech] 모든 음성 기능 정지");
  }

  // 🔁 편의 함수: "멘트 말해주고 → 한 번 듣기" 패턴
  // 🔥 TTS 완료 후 STT 시작 보장 (interrupted 방지)
  async promptAndListen(promptText: string, mode: STTMode = "command"): Promise<string> {
    console.log("[speech] promptAndListen 시작 - TTS:", promptText, "mode:", mode);
    
    // 1. 기존 STT 완전 종료
    this.stopSTT();
    
    // 2. 기존 TTS 완전 취소
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn("[speech] speechSynthesis.cancel() 실패:", e);
      }
    }
    this.clearQueue();
    
    // 3. TTS 재생 시작
    await this.speak(promptText);
    
    // 4. TTS 완전 종료 확인 (더 강력한 대기)
    let waitCount = 0;
    const isSpeaking = typeof window !== "undefined" && window.speechSynthesis 
      ? window.speechSynthesis.speaking 
      : false;
    while ((this.ttsPlaying || this.isProcessingQueue || isSpeaking) && waitCount < 50) {
      await new Promise((r) => setTimeout(r, 100));
      waitCount++;
    }
    
    // 5. 추가 안전 지연 (TTS 완전 종료 보장 + 브라우저 정리 시간)
    await new Promise((r) => setTimeout(r, 500)); // 300ms → 500ms로 증가
    
    console.log("[speech] TTS 완료 확인됨 → STT 시작 (mode:", mode, ")");
    
    // 6. STT 시작
    return await this.listenOnce(mode);
  }

  // 🔥 safeSpeak 패턴: TTS/STT 충돌 방지 로직
  // stopSTT() → speak() → 완료 후 startSTT() 자동 실행
  async safeSpeak(text: string, onComplete?: () => void): Promise<void> {
    // 1. STT 강제 종료
    this.stopSTT();
    
    // 2. TTS 재생
    await this.speak(text);
    
    // 3. TTS 완료 후 콜백 실행
    if (onComplete) {
      await new Promise((r) => setTimeout(r, 300)); // 안전 지연
      onComplete();
    }
  }
}

// 바깥에서 이렇게 씀
export const speechEngine = SpeechEngine.instance;
