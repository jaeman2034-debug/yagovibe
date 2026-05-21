import React from "react";

interface TradeClosedNoticeProps {
  /** 거래 종료 시 표시 여부 */
  visible: boolean;
  /** 안내 메시지 (기본값 제공) */
  message?: string;
}

const DEFAULT_MESSAGE = "거래는 종료되었지만, 일정 조율이나 문의는 계속할 수 있어요.";

/**
 * 거래 종료 상태 안내 컴포넌트
 * 거래가 종료되었을 때 입력창 위에 표시되는 안내 메시지
 */
export function TradeClosedNotice({ visible, message = DEFAULT_MESSAGE }: TradeClosedNoticeProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        flexShrink: 0,
        background: "#F9FAFB",
        borderTop: "1px solid #E5E7EB",
        padding: "8px 16px",
        fontSize: 12,
        color: "#6B7280",
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  );
}
