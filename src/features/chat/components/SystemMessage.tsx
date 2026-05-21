import React from "react";

interface SystemMessageProps {
  text: string;
}

/**
 * 시스템 메시지 컴포넌트
 * 거래 완료, 입장 등의 시스템 알림 메시지 표시
 */
export function SystemMessage({ text }: SystemMessageProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
        marginTop: 8,
      }}
    >
      <div
        style={{
          padding: "8px 16px",
          borderRadius: 16,
          background: "#F3F4F6",
          color: "#6B7280",
          fontSize: 13,
          fontWeight: 500,
          textAlign: "center",
          maxWidth: "80%",
        }}
      >
        {text}
      </div>
    </div>
  );
}
