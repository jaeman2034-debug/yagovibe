import React from "react";

interface TextMessageProps {
  text: string;
  isMine: boolean;
  isPending?: boolean;
  createdAt?: any;
  readBy?: string[];
  compact?: boolean;
}

/**
 * 텍스트 메시지 컴포넌트
 * 일반 텍스트 메시지 말풍선 표시
 */
export function TextMessage({ text, isMine, isPending = false, createdAt, readBy, compact = false }: TextMessageProps) {
  const formatTime = (ts?: any): string => {
    if (!ts) return "";
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`message-row ${isMine ? "me" : "other"}`}
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        marginBottom: compact ? 6 : 12,
        alignItems: "flex-end",
        gap: 6,
      }}
    >
      <div
        className="message-bubble chat-message"
        style={{
          maxWidth: "70%",
          padding: "10px 16px",
          borderRadius: 18,
          background: isPending 
            ? (isMine ? "rgba(37, 99, 235, 0.6)" : "#f3f4f6")
            : (isMine ? "#2563eb" : "#fff"),
          color: isPending
            ? (isMine ? "rgba(255, 255, 255, 0.8)" : "#9ca3af")
            : (isMine ? "#fff" : "#111827"),
          border: isMine ? "none" : "1px solid #e5e7eb",
          boxShadow: isMine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
          wordBreak: "break-word",
          overflowWrap: "break-word",
          fontSize: 14,
          opacity: isPending ? 0.7 : 1,
          minWidth: 0,
        }}
      >
        {text}
        {/* 🔥 전송 중 표시 (내 메시지만) */}
        {isPending && isMine && (
          <span style={{ 
            fontSize: 12, 
            color: "rgba(255, 255, 255, 0.8)", 
            marginLeft: 8,
            display: "inline-block",
          }}>
            전송중…
          </span>
        )}
      </div>
      {/* 시간 + 읽음표시 (카카오톡 스타일) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isMine ? "flex-end" : "flex-start",
          marginLeft: isMine ? 8 : 0,
          marginRight: isMine ? 0 : 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#9ca3af",
            marginTop: 2,
            textAlign: isMine ? "right" : "left",
          }}
        >
          {formatTime(createdAt)}
        </div>
        {isMine && (
          <div
            style={{
              fontSize: 10,
              color: "#9ca3af",
              marginTop: 2,
              textAlign: "right",
            }}
          >
            {(readBy && readBy.length > 1) ? "읽음" : "안읽음"}
          </div>
        )}
      </div>
    </div>
  );
}
