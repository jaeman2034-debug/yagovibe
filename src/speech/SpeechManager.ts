// src/speech/SpeechManager.ts
// 🔥 Phase 3-2: 상태 기반 SpeechManager (구독 패턴)

import { speechEngine } from "@/voice/speechEngine";
import { isMobileDevice } from "@/utils/deviceDetection";

type SpeechContext = {
  pathname: string;
  isMobile: boolean;
  user: any | null;
};

export type SpeechState =
  | { status: "disabled"; reason: "desktop" | "blockedRoute" | "loggedOut" }
  | { status: "idle" }
  | { status: "listening" }
  | { status: "error"; message: string; recoverable: boolean };

class SpeechManagerClass {
  private enabled = false;
  private lastContextKey = "";
  private state: SpeechState = { status: "disabled", reason: "loggedOut" };
  private listeners = new Set<(s: SpeechState) => void>();

  private blockedRoutes = ["/login", "/signup", "/start", "/login/phone"];
  private allowedRoutes = [
    "/sports-hub",
    "/app/market",
    "/voice-map",
    "/market/map",
    "/app/facility",
    "/app/team",
    "/app/event",
    "/app/admin",
  ];

  subscribe(fn: (s: SpeechState) => void) {
    this.listeners.add(fn);
    fn(this.state); // 즉시 1회 발행
    return () => this.listeners.delete(fn);
  }

  getState() {
    return this.state;
  }

  private setState(next: SpeechState) {
    this.state = next;
    for (const fn of this.listeners) fn(next);
  }

  updateContext(ctx: SpeechContext) {
    const { pathname, isMobile, user } = ctx;

    const routeBlocked =
      this.blockedRoutes.some((r) => pathname.startsWith(r)) ||
      !this.allowedRoutes.some((r) => pathname.startsWith(r));

    let shouldAllow = true as boolean;

    if (!isMobile) {
      shouldAllow = false;
      this.setState({ status: "disabled", reason: "desktop" });
    } else if (!user) {
      shouldAllow = false;
      this.setState({ status: "disabled", reason: "loggedOut" });
    } else if (routeBlocked) {
      shouldAllow = false;
      this.setState({ status: "disabled", reason: "blockedRoute" });
    } else {
      // allowed
      if (this.state.status === "disabled") this.setState({ status: "idle" });
    }

    const contextKey = `${pathname}-${isMobile}-${!!user}-${shouldAllow}`;
    if (this.lastContextKey === contextKey) return;
    this.lastContextKey = contextKey;

    // 🔥 Phase 3-2.5: 로그 레벨 정리 (DEV만 상세 로그)
    if (import.meta.env.DEV) {
      console.log("[SpeechManager] updateContext:", {
        pathname,
        isMobile,
        user: !!user,
        speechAllowed: shouldAllow,
        state: this.state.status,
      });
    } else {
      // PROD: Desktop 차단만 로그
      if (!isMobile) {
        console.info("[Speech] disabled (desktop)");
      }
    }

    if (!shouldAllow) {
      this.stopAll();
    }
  }

  // 🔥 Phase 3-3: STT 결과 콜백
  private sttResultListeners = new Set<(text: string) => void>();

  subscribeToSTTResult(fn: (text: string) => void) {
    this.sttResultListeners.add(fn);
    return () => this.sttResultListeners.delete(fn);
  }

  private emitSTTResult(text: string) {
    for (const fn of this.sttResultListeners) {
      fn(text);
    }
  }

  /** ✅ UX 정책: 자동 STT 시작 ❌, 사용자 버튼으로만 시작 */
  async startListeningByUserGesture() {
    // 🔥 1차 가드: 데스크톱 완전 차단
    if (!isMobileDevice()) {
      // 🔥 Phase 3-2.5: Desktop에서 단 한 줄만 로그
      console.info("[Speech] disabled (desktop)");
      return;
    }

    // disabled면 무시
    if (this.state.status === "disabled") {
      console.warn("[SpeechManager] startListeningByUserGesture: disabled 상태");
      return;
    }

    // 이미 듣는 중이면 무시
    if (this.state.status === "listening") {
      console.warn("[SpeechManager] startListeningByUserGesture: 이미 listening");
      return;
    }

    try {
      this.enabled = true;
      this.setState({ status: "listening" });
      
      // 🔥 SpeechManager를 통해 STT 실행 (user gesture 내에서)
      const text = await speechEngine.listenOnce("command");
      
      // 🔥 Phase 3-2.5: no-speech 처리 (Case 1: 3초 후 자동 종료 시나리오)
      if (!text || text.trim() === "") {
        // 사용자가 아무 말도 안 함 → TTS 피드백 후 종료
        this.setState({ status: "idle" });
        await this.speak("다시 말해 주세요.");
        return "";
      }
      
      // 인식 완료 → idle로 전환
      this.setState({ status: "idle" });
      
      // 🔥 Phase 3-3: STT 결과 발행
      this.emitSTTResult(text);
      
      return text;
    } catch (e: any) {
      this.enabled = false;
      const errorMsg = e?.message || e?.error || "마이크를 시작할 수 없습니다.";
      
      // 권한 거부 감지
      if (e?.error === "not-allowed" || e?.name === "NotAllowedError") {
        this.setState({
          status: "error",
          message: "마이크 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.",
          recoverable: true,
        });
      } else {
        this.setState({
          status: "error",
          message: errorMsg,
          recoverable: true,
        });
      }
      
      throw e;
    }
  }

  stopAll() {
    if (!this.enabled && this.state.status !== "listening") {
      // 상태만 정리
      if (this.state.status === "listening") this.setState({ status: "idle" });
      return;
    }

    this.enabled = false;
    speechEngine.stopAll();

    // allowed면 idle로, 아니면 disabled 유지
    if (this.state.status === "listening") {
      this.setState({ status: "idle" });
    }
  }

  // (선택) 엔진에서 "권한 거부/에러" 콜백을 연결할 수 있으면 여기로 전달
  setError(message: string, recoverable = true) {
    this.enabled = false;
    this.setState({ status: "error", message, recoverable });
  }

  clearError() {
    if (this.state.status === "error") {
      this.setState({ status: "idle" });
    }
  }

  // 외부 API (하위 호환성)
  isAllowed(): boolean {
    return this.state.status !== "disabled";
  }

  async speak(text: string): Promise<void> {
    if (!this.isAllowed()) {
      console.warn("[SpeechManager] speak 차단됨");
      return;
    }
    await speechEngine.speak(text);
  }

  async listenOnce(mode: "command" | "field" = "command"): Promise<string> {
    if (!this.isAllowed()) {
      console.warn("[SpeechManager] listenOnce 차단됨");
      return "";
    }
    return await speechEngine.listenOnce(mode);
  }

  async promptAndListen(promptText: string, mode: "command" | "field" = "command"): Promise<string> {
    if (!this.isAllowed()) {
      console.warn("[SpeechManager] promptAndListen 차단됨");
      return "";
    }
    return await speechEngine.promptAndListen(promptText, mode);
  }

  async safeSpeak(text: string, onComplete?: () => void): Promise<void> {
    if (!this.isAllowed()) {
      if (onComplete) onComplete();
      return;
    }
    await speechEngine.safeSpeak(text, onComplete);
  }
}

export const speechManager = new SpeechManagerClass();
