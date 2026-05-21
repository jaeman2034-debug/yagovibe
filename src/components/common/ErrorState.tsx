/**
 * 🚀 공통 Error State 컴포넌트 (출시 직전 완성)
 * 
 * 역할:
 * - Firebase 에러 등 서비스 오류 대응
 * - 사용자에게 명확한 에러 메시지 표시
 * - 재시도 기능 제공
 * - 서비스 신뢰도 핵심
 */

import React from "react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ 
  message = "데이터 불러오기 실패", 
  onRetry,
  title = "오류가 발생했습니다"
}: ErrorStateProps) {
  return (
    <div
      className="error-state"
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "48px 24px",
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        style={{
          fontSize: "64px",
          marginBottom: "16px",
        }}
      >
        ⚠️
      </div>
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: "8px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "#666",
          marginBottom: onRetry ? "24px" : "0",
        }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary"
          style={{
            marginTop: "24px",
            padding: "12px 24px",
            borderRadius: "12px",
            backgroundColor: "#1a73e8",
            color: "white",
            fontSize: "16px",
            fontWeight: "600",
            border: "none",
            cursor: "pointer",
            transition: "background 0.2s",
            minWidth: "120px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#1557b0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#1a73e8";
          }}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
