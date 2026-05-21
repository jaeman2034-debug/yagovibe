/**
 * 🔥 상단 고정 공지 헤더 (Sticky Notice)
 */
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pin, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PinnedNoticeHeaderProps {
  teamId: string;
}

export default function PinnedNoticeHeader({ teamId }: PinnedNoticeHeaderProps) {
  const [pinnedNotice, setPinnedNotice] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const navigate = useNavigate();

  // 🔥 고정 공지 조회
  useEffect(() => {
    if (!teamId) return;

    const fetchPinnedNotice = async () => {
      try {
        const noticesRef = collection(db, "teams", teamId, "notices");
        const q = query(
          noticesRef,
          where("isPinned", "==", true),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const snap = await getDocs(q);
        if (!snap.empty) {
          const doc = snap.docs[0];
          setPinnedNotice({
            id: doc.id,
            title: doc.data().title || "공지",
            content: doc.data().content || "",
          });
        }
      } catch (error) {
        console.error("❌ [PinnedNoticeHeader] 고정 공지 조회 실패:", error);
      }
    };

    fetchPinnedNotice();
  }, [teamId]);

  // 로컬 스토리지에서 숨김 상태 확인
  useEffect(() => {
    if (pinnedNotice) {
      const hiddenKey = `pinned_notice_hidden_${pinnedNotice.id}`;
      const isHiddenLocal = localStorage.getItem(hiddenKey) === "true";
      setIsHidden(isHiddenLocal);
    }
  }, [pinnedNotice]);

  if (!pinnedNotice || isHidden) {
    return null;
  }

  const handleClose = () => {
    const hiddenKey = `pinned_notice_hidden_${pinnedNotice.id}`;
    localStorage.setItem(hiddenKey, "true");
    setIsHidden(true);
  };

  const handleClick = () => {
    navigate(`/teams/${teamId}/notices/${pinnedNotice.id}`);
  };

  // 미리보기 텍스트 (2-3줄)
  const preview = pinnedNotice.content.length > 80
    ? pinnedNotice.content.substring(0, 80) + "..."
    : pinnedNotice.content;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#fff",
        borderBottom: "2px solid #fbbf24",
        padding: "12px 16px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          cursor: "pointer",
        }}
      >
        {/* 고정 아이콘 */}
        <div
          style={{
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <Pin size={18} color="#fbbf24" fill="#fbbf24" />
        </div>

        {/* 공지 내용 */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#fbbf24",
              marginBottom: 4,
            }}
          >
            팀 공지
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#111827",
              marginBottom: 4,
            }}
          >
            {pinnedNotice.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            {preview}
          </div>
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          style={{
            flexShrink: 0,
            padding: 4,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} color="#9ca3af" />
        </button>
      </div>
    </div>
  );
}
