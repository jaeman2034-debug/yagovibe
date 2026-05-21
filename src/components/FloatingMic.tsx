/**
 * 🔥 FloatingMic - 플로팅 마이크 버튼 (STEP 1 + STEP 2 + STEP 3 + STEP 4 FINAL)
 * 
 * STEP 1: 권한 요청 + 듣는 중 UI
 * STEP 2: 듣는 중 애니메이션 + 5초 자동 종료
 * STEP 3: 음성 → 텍스트만 입력창에 반영
 * STEP 4: 음성 명령 파싱 + 확인 모달 (FINAL LOCK)
 * 
 * 요구사항:
 * - 마이크 아이콘만 투명한 플로팅 버튼
 * - 화면 어디든 드래그 & 드롭 가능
 * - 클릭 시 마이크 권한 요청
 * - 허용 시 듣는 중 상태 UI
 * - 5초 후 자동 종료
 * - 음성 인식 텍스트를 현재 포커스된 input에 삽입
 * - 명령 감지 시 확인 모달 표시
 * - 확인 후에만 실행 (실수 방지)
 */

import { useState, useRef, useEffect } from "react";
import { Mic } from "lucide-react";

type MicState = "idle" | "requesting" | "listening" | "denied";

// STEP 4: 명령 타입 정의
type VoiceCommand =
  | { type: "submit_signup" }
  | { type: "focus_email" }
  | { type: "focus_password" }
  | null;

interface FloatingMicProps {
  onVoiceCommand?: () => void; // 나중에 음성 기능 연결용
}

// STEP 4: 명령 파서 (단순하게 시작)
function parseVoiceCommand(text: string): VoiceCommand {
  const t = text.replace(/\s/g, "").toLowerCase();

  if (t.includes("가입") || t.includes("회원가입") || t.includes("가입하기")) {
    return { type: "submit_signup" };
  }
  if (t.includes("이메일") || t.includes("email")) {
    return { type: "focus_email" };
  }
  if (t.includes("비밀번호") || t.includes("password")) {
    return { type: "focus_password" };
  }

  return null;
}

// STEP 4: 실제 실행 함수 (DOM 이벤트만 트리거)
function executeCommand(cmd: VoiceCommand) {
  if (!cmd) return;

  switch (cmd.type) {
    case "submit_signup":
      // 회원가입 버튼 클릭
      const submitBtn = document.querySelector<HTMLButtonElement>(
        'button[type="submit"]'
      );
      if (submitBtn) {
        submitBtn.click();
      }
      break;

    case "focus_email":
      // 이메일 입력창 포커스
      const emailInput = document.querySelector<HTMLInputElement>(
        'input[type="email"]'
      );
      if (emailInput) {
        emailInput.focus();
      }
      break;

    case "focus_password":
      // 비밀번호 입력창 포커스
      const passwordInput = document.querySelector<HTMLInputElement>(
        'input[type="password"]'
      );
      if (passwordInput) {
        passwordInput.focus();
      }
      break;
  }
}

// STEP 3: Web Speech API 타입 정의
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// STEP 3: SpeechRecognition 클래스 타입
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function FloatingMic({ onVoiceCommand }: FloatingMicProps) {
  const [pos, setPos] = useState({ x: 20, y: 120 });
  const [open, setOpen] = useState(false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [pendingCommand, setPendingCommand] = useState<VoiceCommand>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const listenTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const LISTEN_DURATION_MS = 5000; // 5초

  // STEP 3: SpeechRecognition 초기화
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  // STEP 3: recognition 객체 생성 (1회)
  const initRecognition = (): SpeechRecognition | null => {
    if (!SpeechRecognition) {
      console.warn("⚠️ [FloatingMic] SpeechRecognition not supported");
      return null;
    }

    try {
      const rec = new SpeechRecognition() as SpeechRecognition;
      rec.lang = "ko-KR";
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      // 에러 핸들링 (UX 안 깨지게)
      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn("⚠️ [FloatingMic] Speech recognition error:", event.error);
        // 에러가 나도 조용히 처리 (UX 방해 안 함)
      };

      rec.onend = () => {
        // 자동 종료 시 정리
        if (micState === "listening") {
          // 타이머가 종료하는 경우도 있으니 조용히 처리
        }
      };

      return rec;
    } catch (e) {
      console.warn("⚠️ [FloatingMic] Failed to initialize SpeechRecognition:", e);
      return null;
    }
  };

  // STEP 3: 텍스트 삽입 유틸 (핵심)
  const insertTextToActiveInput = (text: string) => {
    const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;

    if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) {
      return;
    }

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    const newValue =
      el.value.substring(0, start) +
      text +
      el.value.substring(end);

    el.value = newValue;

    // React input 이벤트 트리거
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));

    // 커서 위치 업데이트
    const newCursorPos = start + text.length;
    el.setSelectionRange(newCursorPos, newCursorPos);
  };

  // 초기 위치를 localStorage에서 복원
  useEffect(() => {
    const savedPos = localStorage.getItem("floatingMicPosition");
    if (savedPos) {
      try {
        const { x, y } = JSON.parse(savedPos);
        setPos({ x, y });
      } catch (e) {
        // 파싱 실패 시 기본값 사용
      }
    }
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // STEP 2 + STEP 3: 듣는 중 상태 종료 + recognition 정리
  const stopListening = () => {
    // 타이머 정리
    if (listenTimerRef.current) {
      window.clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
    
    // STEP 3: recognition 정리
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // 이미 종료된 경우 등 에러는 조용히 처리
      }
    }
    
    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    setMicState("idle");
    setOpen(false);
  };

  // STEP 1 + STEP 2 + STEP 3: 마이크 권한 요청 + 듣는 중 시작 + 음성 인식 연결
  const startListening = async () => {
    try {
      setMicState("requesting");
      
      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      setMicState("listening");
      setOpen(true); // 자동으로 드롭다운 열기
      
      // STEP 3: SpeechRecognition 초기화 및 시작
      if (!recognitionRef.current) {
        recognitionRef.current = initRecognition();
      }

      if (recognitionRef.current) {
        // STEP 3 + STEP 4: 음성 인식 결과 처리
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript.trim();
          if (transcript) {
            // STEP 3: 텍스트 삽입
            insertTextToActiveInput(transcript);

            // STEP 4: 명령 감지
            const command = parseVoiceCommand(transcript);
            if (command) {
              setPendingCommand(command);
              setConfirmOpen(true);
              // 명령 감지 시 listening 종료
              stopListening();
            }
          }
        };

        try {
          recognitionRef.current.start();
        } catch (e: any) {
          // 이미 시작된 경우 등 에러는 조용히 처리
          console.warn("⚠️ [FloatingMic] Speech recognition start error:", e);
        }
      }
      
      // STEP 2: 5초 후 자동 종료
      listenTimerRef.current = window.setTimeout(() => {
        stopListening();
      }, LISTEN_DURATION_MS);
    } catch (e: any) {
      console.error("❌ [FloatingMic] 마이크 권한 요청 실패:", e);
      setMicState("denied");
      setOpen(true);
      
      // 권한 거부 시 3초 후 자동으로 닫기
      setTimeout(() => {
        setOpen(false);
        setMicState("idle");
      }, 3000);
    }
  };

  // 위치 저장
  const savePosition = (newPos: { x: number; y: number }) => {
    localStorage.setItem("floatingMicPosition", JSON.stringify(newPos));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const initX = pos.x;
    const initY = pos.y;

    const onMove = (ev: MouseEvent) => {
      dragging.current = true;
      const newPos = {
        x: Math.max(0, Math.min(window.innerWidth - 56, initX + (ev.clientX - dragStartPos.current.x))),
        y: Math.max(0, Math.min(window.innerHeight - 56, initY + (ev.clientY - dragStartPos.current.y))),
      };
      setPos(newPos);
    };

    const onUp = () => {
      if (dragging.current) {
        savePosition(pos);
      }
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // 드래그 종료 후 약간의 딜레이로 클릭 이벤트 무시
      setTimeout(() => {
        dragging.current = false;
      }, 100);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // 터치 이벤트 지원 (모바일)
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    dragging.current = false;
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    const initX = pos.x;
    const initY = pos.y;

    const onMove = (ev: TouchEvent) => {
      if (ev.touches.length === 0) return;
      dragging.current = true;
      const touch = ev.touches[0];
      const newPos = {
        x: Math.max(0, Math.min(window.innerWidth - 56, initX + (touch.clientX - dragStartPos.current.x))),
        y: Math.max(0, Math.min(window.innerHeight - 56, initY + (touch.clientY - dragStartPos.current.y))),
      };
      setPos(newPos);
    };

    const onEnd = () => {
      if (dragging.current) {
        savePosition(pos);
      }
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      setTimeout(() => {
        dragging.current = false;
      }, 100);
    };

    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  };

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragging.current) return;

    // 클릭 동작 규칙
    if (micState === "idle") {
      await startListening();
    } else if (micState === "listening") {
      stopListening(); // 듣는 중 다시 클릭 → 즉시 종료
    } else {
      setOpen((v) => !v); // denied나 requesting 상태면 드롭다운만 토글
    }
  };

  const handleVoiceCommand = () => {
    if (onVoiceCommand) {
      onVoiceCommand();
    }
    setOpen(false);
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div
      ref={buttonRef}
      style={{
        position: "fixed",
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 9999,
      }}
    >
      {/* 마이크 버튼 */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={onClick}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background:
            micState === "listening"
              ? "rgba(0, 120, 255, 0.15)"
              : micState === "requesting"
              ? "rgba(255, 193, 7, 0.15)"
              : micState === "denied"
              ? "rgba(220, 53, 69, 0.15)"
              : "rgba(0, 0, 0, 0.05)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: dragging.current ? "grabbing" : "grab",
          transition: dragging.current ? "none" : "all 0.2s ease",
          boxShadow:
            micState === "listening"
              ? "0 0 0 0 rgba(0, 120, 255, 0.35), 0 4px 12px rgba(0, 0, 0, 0.1)"
              : "0 4px 12px rgba(0, 0, 0, 0.1)",
          animation:
            micState === "listening" ? "pulse 1.5s infinite" : "none",
        }}
        onMouseEnter={(e) => {
          if (!dragging.current && micState === "idle") {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.08)";
          }
        }}
        onMouseLeave={(e) => {
          if (micState === "idle") {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
          }
        }}
      >
        <style>{`
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(0, 120, 255, 0.35);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(0, 120, 255, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(0, 120, 255, 0);
            }
          }
        `}</style>
        <Mic
          className={`w-6 h-6 ${
            micState === "listening"
              ? "text-blue-600"
              : micState === "denied"
              ? "text-red-600"
              : micState === "requesting"
              ? "text-yellow-600"
              : "text-gray-700"
          }`}
          strokeWidth={2}
        />
      </div>

      {/* 드롭다운 메뉴 */}
      {open && (
        <div
          style={{
            marginTop: 8,
            padding: "12px",
            background: "white",
            borderRadius: 12,
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
            fontSize: 14,
            minWidth: 180,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(-8px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes listeningPulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.5;
              }
            }
          `}</style>

          {/* STEP 3: 상태별 메시지 (UX 고정) */}
          {micState === "listening" && (
            <div style={{ padding: "8px 0", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#0066cc" }}>
                🎧 듣는 중… 말해보세요
              </div>
            </div>
          )}

          {micState === "idle" && (
            <div style={{ padding: "8px 0", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1f2937" }}>
                🎤 클릭해서 말하기
              </div>
            </div>
          )}

          {micState === "denied" && (
            <div style={{ padding: "8px 0", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#d00" }}>
                마이크 권한이 필요해요
              </div>
            </div>
          )}

          {/* 🔥 WeChat Mode: 최종 카피 */}
          <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
            음성으로 입력할 수 있어요
          </div>
          <div style={{ marginTop: 4, color: "#9ca3af", fontSize: 11, fontStyle: "italic" }}>
            실행 전에는 항상 확인합니다
          </div>
        </div>
      )}

      {/* STEP 4: 확인 모달 (핵심 UX) */}
      {confirmOpen && pendingCommand && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => {
            setConfirmOpen(false);
            setPendingCommand(null);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: "24px",
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              animation: "slideUp 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes slideUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: 18,
                fontWeight: 600,
                color: "#1f2937",
              }}
            >
              음성 명령 확인
            </h3>

            {pendingCommand.type === "submit_signup" && (
              <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#4b5563" }}>
                회원가입을 진행할까요?
              </p>
            )}
            {pendingCommand.type === "focus_email" && (
              <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#4b5563" }}>
                이메일 입력창으로 이동할까요?
              </p>
            )}
            {pendingCommand.type === "focus_password" && (
              <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#4b5563" }}>
                비밀번호 입력창으로 이동할까요?
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingCommand(null);
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  color: "#4b5563",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  executeCommand(pendingCommand);
                  setConfirmOpen(false);
                  setPendingCommand(null);
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0066cc",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#0052a3";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#0066cc";
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

