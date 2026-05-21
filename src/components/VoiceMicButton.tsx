// src/components/VoiceMicButton.tsx
// 🔥 Phase 3-2: 단일 마이크 버튼 컴포넌트 (3단계 상태)

import { speechManager } from "@/speech/SpeechManager";
import { useSpeechState } from "@/speech/useSpeechState";
import { isMobileDevice } from "@/utils/deviceDetection";
import { useState, useEffect } from "react";

type MicState = "idle" | "listening" | "processing";

export function VoiceMicButton() {
  // 🔥 모든 hook은 조건부 return 전에 호출되어야 함 (React Hooks 규칙)
  const state = useSpeechState();
  const [micState, setMicState] = useState<MicState>("idle");

  // 상태 동기화 (hook이므로 조건부 return 전에 호출)
  useEffect(() => {
    if (state.status === "listening") {
      setMicState("listening");
    } else if (state.status === "idle") {
      // listening → idle 전환 시 processing 상태 표시 (0.5초)
      setMicState((prev) => {
        if (prev === "listening") {
          setTimeout(() => setMicState("idle"), 500);
          return "processing";
        }
        return "idle";
      });
    } else if (state.status === "error") {
      setMicState("idle");
    }
  }, [state.status]);

  // 🔥 조건부 return은 모든 hook 호출 후에
  // 2차 가드: 데스크톱에서 렌더링 차단
  if (!isMobileDevice()) {
    return null;
  }

  // disabled 상태면 렌더링하지 않음
  if (state.status === "disabled") return null;

  const onClick = async () => {
    if (state.status === "error") {
      speechManager.clearError();
      return;
    }

    if (state.status === "listening") {
      speechManager.stopAll();
      return;
    }

    // ✅ user gesture에서만 시작
    try {
      await speechManager.startListeningByUserGesture();
    } catch (error) {
      // 에러는 SpeechManager에서 상태로 처리됨
      console.error("[VoiceMicButton] startListeningByUserGesture 실패:", error);
    }
  };

  const getLabel = () => {
    switch (state.status) {
      case "idle":
        return "말하기";
      case "listening":
        return "듣는 중…";
      case "error":
        return "오류(탭하여 초기화)";
      default:
        return "말하기";
    }
  };

  const getButtonStyle = () => {
    switch (micState) {
      case "listening":
        return "bg-red-500 animate-pulse ring-4 ring-red-300 ring-opacity-50";
      case "processing":
        return "bg-blue-400 animate-spin";
      case "error":
        return "bg-orange-500";
      default:
        return "bg-gray-400 hover:bg-gray-500";
    }
  };

  const getIcon = () => {
    switch (micState) {
      case "listening":
        return "🎤";
      case "processing":
        return "⏳";
      case "error":
        return "⚠️";
      default:
        return "🎙";
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full text-2xl shadow-xl transition-all hover:scale-110 ${getButtonStyle()}`}
      aria-label="음성 입력"
      disabled={state.status === "listening"}
    >
      {getIcon()}
    </button>
  );
}

