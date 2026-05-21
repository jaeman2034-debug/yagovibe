/**
 * 🚀 공통 Empty State 컴포넌트 (출시 직전 완성)
 * 
 * 원칙:
 * - 전화/문의 유발 요소 절대 없음
 * - 공식 기준 명시
 * - 모든 섹션 페이지에서 통일된 메시지
 * - "없습니다" ❌ → "본 페이지 기준" ✅
 * - action 버튼 지원 (서비스 완성도 2배 상승)
 */

import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: string;
}

export function EmptyState({ title, description, action, icon = "📭" }: EmptyStateProps) {
  return (
    <div
      className="empty-state"
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
        {icon}
      </div>
      <p
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: "8px",
        }}
      >
        {title}
      </p>
      {description && (
        <p
          style={{
            fontSize: "14px",
            color: "#666",
            marginBottom: action ? "24px" : "0",
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: "24px" }}>
          {action}
        </div>
      )}
    </div>
  );
}

