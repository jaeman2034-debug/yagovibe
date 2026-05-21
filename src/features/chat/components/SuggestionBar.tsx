import React, { useRef } from "react";

interface SuggestionBarProps {
  suggestions: string[];
  isLoading: boolean;
  isSTTSupported: boolean;
  isListening: boolean;
  onSuggestionClick: (text: string) => void;
  onSuggestionLongPress: (text: string) => void;
  onSTTStart: () => void;
}

/**
 * 추천 문장 바 컴포넌트
 * 입력창 위에 표시되는 추천 문장 버튼들과 STT 버튼
 */
export function SuggestionBar({
  suggestions,
  isLoading,
  isSTTSupported,
  isListening,
  onSuggestionClick,
  onSuggestionLongPress,
  onSTTStart,
}: SuggestionBarProps) {
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (suggestions.length === 0 && !isSTTSupported) {
    return null;
  }

  const handleLongPressStart = (suggestion: string) => {
    // 기존 타이머 정리
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    // 새 타이머 시작
    longPressTimerRef.current = setTimeout(() => {
      onSuggestionLongPress(suggestion);
      longPressTimerRef.current = null;
    }, 500); // 500ms 롱프레스
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      className="quick-replies"
      style={{
        flexShrink: 0,
        background: "#fff",
        borderTop: "none",
        padding: "4px 0",
        marginTop: 0,
        zIndex: 5,
        boxShadow: "none",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        overflowY: "visible",
        minWidth: 0,
      }}
    >
      {isLoading ? (
        <div style={{ padding: "6px 12px", color: "#9ca3af", fontSize: 13 }}>
          추천 문장 로딩 중...
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap", // 🔥 핵심: 줄바꿈 허용 (모바일 반응형)
            gap: 8,
            padding: "0 12px 6px 12px",
            width: "100%", // 🔥 핵심: 부모 너비 100% (maxWidth 제한 없음)
            maxWidth: "100%", // 🔥 핵심: 최대 너비 제한
            boxSizing: "border-box", // 🔥 핵심: 패딩 포함 너비 계산
            minWidth: 0, // 🔥 핵심: flex 오버플로우 방지
            overflowX: "hidden", // 🔥 핵심: 가로 스크롤 금지 (flex-wrap 작동 보장)
            overflowY: "visible", // 🔥 핵심: 세로는 허용
          }}
        >
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                handleLongPressEnd(); // 타이머 정리
                onSuggestionClick(suggestion);
              }}
              onTouchStart={() => handleLongPressStart(suggestion)}
              onTouchEnd={handleLongPressEnd}
              onMouseDown={() => handleLongPressStart(suggestion)}
              onMouseUp={handleLongPressEnd}
              style={{
                flex: "0 1 auto", // 🔥 핵심: flex-shrink: 1 (줄바꿈 허용)
                padding: "6px 12px", // 🔥 서비스급: 컴팩트한 버튼
                borderRadius: 16, // 🔥 서비스급: 부드러운 모서리
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#374151",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap", // 🔥 핵심: 버튼 내부 텍스트 줄바꿈 방지
                minWidth: 0, // 🔥 핵심: 강제 줄바꿈 가능하게
                maxWidth: "100%", // 🔥 핵심: 최대 너비 제한 (긴 텍스트 처리)
                overflow: "hidden", // 🔥 핵심: 오버플로우 숨김
                textOverflow: "ellipsis", // 🔥 핵심: 긴 텍스트 말줄임표
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 4, // 🔥 서비스급: 간격 최소화
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#2563eb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#e5e7eb";
                handleLongPressEnd();
              }}
              title="탭: 입력창에 삽입 | 길게 누르기: 듣고 삽입"
            >
              {suggestion}
            </button>
          ))}

          {/* 🎤 음성으로 문장 만들기 버튼 */}
          {isSTTSupported && (
            <button
              type="button"
              onClick={onSTTStart}
              style={{
                flex: typeof window !== "undefined" && window.innerWidth <= 420 
                  ? "1 0 100%" // 🔥 모바일: 한 줄 따로 먹기
                  : "0 1 auto", // 🔥 데스크톱: 줄바꿈 허용
                padding: "8px 16px",
                borderRadius: 20,
                border: "1px solid #2563eb",
                background: isListening ? "#EF4444" : "#2563eb",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap", // 🔥 핵심: 버튼 내부 텍스트 줄바꿈 방지
                minWidth: 0, // 🔥 핵심: 강제 줄바꿈 가능하게
                maxWidth: "100%", // 🔥 핵심: 최대 너비 제한
                overflow: "hidden", // 🔥 핵심: 오버플로우 숨김
                textOverflow: "ellipsis", // 🔥 핵심: 긴 텍스트 말줄임표
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              title={isListening ? "음성 인식 중... (클릭하여 중지)" : "🎤 말로 보내기"}
            >
              🎤 {isListening ? "인식 중..." : "말로 보내기"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
