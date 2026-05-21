/**
 * 🔥 요약 메시지 카드 컴포넌트
 */
import { Bot } from "lucide-react";

interface SummaryMessageCardProps {
  summaryText: string;
  date: string;
}

export default function SummaryMessageCard({
  summaryText,
  date,
}: SummaryMessageCardProps) {
  return (
    <div
      style={{
        maxWidth: "80%",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 12,
        padding: "16px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        color: "#fff",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Bot size={20} color="#fff" />
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            opacity: 0.9,
          }}
        >
          오늘의 팀 요약
        </div>
      </div>

      {/* 요약 내용 */}
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {summaryText}
      </div>

      {/* 날짜 */}
      <div
        style={{
          fontSize: 11,
          opacity: 0.8,
          marginTop: 8,
          textAlign: "right",
        }}
      >
        {date}
      </div>
    </div>
  );
}
