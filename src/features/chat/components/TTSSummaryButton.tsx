import React from "react";

interface TTSSummaryButtonProps {
  isSummarizing: boolean;
  onToggle: () => void;
}

/**
 * TTS 요약 버튼 컴포넌트
 * 채팅 상단 헤더 우측에 표시되는 요약 듣기 버튼
 */
export function TTSSummaryButton({ isSummarizing, onToggle }: TTSSummaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        background: isSummarizing ? "#EF4444" : "#2563eb",
        color: "#fff",
        border: "none",
        borderRadius: 20,
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        zIndex: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!isSummarizing) {
          e.currentTarget.style.background = "#1d4ed8";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSummarizing) {
          e.currentTarget.style.background = "#2563eb";
        }
      }}
      title={
        isSummarizing 
          ? "요약 중지 (클릭)" 
          : "요약 듣기 (최근 대화 한 문장으로)"
      }
    >
      {isSummarizing ? (
        <>
          <span style={{ 
            display: "inline-block",
            width: 12,
            height: 12,
            border: "2px solid #fff",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          요약 생성 중...
        </>
      ) : (
        <>
          🔊 요약 듣기
        </>
      )}
    </button>
  );
}
