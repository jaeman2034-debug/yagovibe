import React from "react";

interface NewMessageButtonProps {
  onClick: () => void;
}

/**
 * 새 메시지 알림 버튼 컴포넌트
 * 하단에 없을 때 표시되는 "새 메시지" 버튼
 */
export function NewMessageButton({ onClick }: NewMessageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "absolute",
        bottom: 20,
        right: 16,
        background: "#2563eb",
        color: "#fff",
        border: "none",
        borderRadius: 20,
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      ↓ 새 메시지
    </button>
  );
}
