/**
 * 🔥 공지 카드 메시지 컴포넌트
 */
import { useNavigate } from "react-router-dom";
import { Pin } from "lucide-react";

interface NoticeMessageCardProps {
  noticeId: string;
  title: string;
  content: string;
  isPinned?: boolean;
  teamId?: string;
}

export default function NoticeMessageCard({
  noticeId,
  title,
  content,
  isPinned,
  teamId,
}: NoticeMessageCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (teamId) {
      navigate(`/teams/${teamId}/notices/${noticeId}`);
    }
  };

  // 미리보기 텍스트 (2-3줄)
  const preview = content.length > 100 ? content.substring(0, 100) + "..." : content;

  return (
    <div
      onClick={handleClick}
      style={{
        maxWidth: "80%",
        background: "#fff",
        border: isPinned ? "2px solid #fbbf24" : "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "12px 16px",
        cursor: "pointer",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.15)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* 고정 아이콘 */}
      {isPinned && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 8,
          }}
        >
          <Pin size={14} color="#fbbf24" fill="#fbbf24" />
          <span
            style={{
              fontSize: 11,
              color: "#fbbf24",
              fontWeight: 600,
            }}
          >
            고정 공지
          </span>
        </div>
      )}

      {/* 제목 */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "#111827",
          marginBottom: 8,
        }}
      >
        📌 {title}
      </div>

      {/* 미리보기 */}
      <div
        style={{
          fontSize: 13,
          color: "#6b7280",
          lineHeight: 1.5,
          marginBottom: 8,
          whiteSpace: "pre-wrap",
        }}
      >
        {preview}
      </div>

      {/* 자세히 보기 */}
      <div
        style={{
          fontSize: 12,
          color: "#2563eb",
          fontWeight: 500,
          textAlign: "right",
        }}
      >
        자세히 보기 →
      </div>
    </div>
  );
}
