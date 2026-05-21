/**
 * 🔥 리포트 메시지 카드 컴포넌트
 */
import { BarChart3, Trophy, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReportMessageCardProps {
  reportId: string;
  teamId?: string;
  month: string;
  totalMessages: number;
  activeMembers: number;
  eventsCreated: number;
  topMemberId?: string;
  topMemberName?: string;
  topMemberScore?: number;
}

export default function ReportMessageCard({
  reportId,
  teamId,
  month,
  totalMessages,
  activeMembers,
  eventsCreated,
  topMemberId,
  topMemberName,
  topMemberScore,
}: ReportMessageCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (teamId) {
      navigate(`/teams/${teamId}/ranking`);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        maxWidth: "80%",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "16px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        cursor: "pointer",
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
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <BarChart3 size={20} color="#2563eb" />
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#111827",
          }}
        >
          {month} 팀 리포트
        </div>
      </div>

      {/* 통계 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            color: "#374151",
          }}
        >
          <Users size={16} color="#6b7280" />
          <span>총 메시지: {totalMessages.toLocaleString()}개</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            color: "#374151",
          }}
        >
          <Users size={16} color="#6b7280" />
          <span>활동 멤버: {activeMembers}명</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            color: "#374151",
          }}
        >
          <Calendar size={16} color="#6b7280" />
          <span>이벤트: {eventsCreated}건</span>
        </div>
      </div>

      {/* 구분선 */}
      <div
        style={{
          height: 1,
          background: "#e5e7eb",
          marginBottom: 12,
        }}
      />

      {/* MVP */}
      {topMemberId && topMemberName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "#fef3c7",
            borderRadius: 8,
          }}
        >
          <Trophy size={18} color="#f59e0b" />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 12,
                color: "#92400e",
                fontWeight: 600,
                marginBottom: 2,
              }}
            >
              🏆 MVP
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#78350f",
              }}
            >
              {topMemberName}
            </div>
            {topMemberScore !== undefined && (
              <div
                style={{
                  fontSize: 12,
                  color: "#92400e",
                  marginTop: 2,
                }}
              >
                {topMemberScore}점
              </div>
            )}
          </div>
        </div>
      )}

      {/* 자세히 보기 */}
      <div
        style={{
          fontSize: 12,
          color: "#2563eb",
          fontWeight: 500,
          textAlign: "right",
          marginTop: 12,
        }}
      >
        랭킹 보기 →
      </div>
    </div>
  );
}
