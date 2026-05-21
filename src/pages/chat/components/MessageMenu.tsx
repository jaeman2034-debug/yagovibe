/**
 * 🔥 메시지 메뉴 컴포넌트 (차단/신고)
 * 
 * 역할:
 * - 메시지 우클릭 메뉴
 * - 차단/신고 기능
 * - Trade/Recruit 공통
 */

import { useState, useRef, useEffect } from "react";
import { blockUser } from "@/lib/chat/blockUser";
import { reportMessage } from "@/lib/chat/reportMessage";
import type { ReportType } from "@/lib/chat/reportMessage";

interface MessageMenuProps {
  messageId: string;
  senderId: string;
  roomId: string;
  myUid: string;
  isMine: boolean;
  onClose: () => void;
  onBlock?: () => void;
}

export default function MessageMenu({
  messageId,
  senderId,
  roomId,
  myUid,
  isMine,
  onClose,
  onBlock,
}: MessageMenuProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("abuse");
  const [reportText, setReportText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 🔥 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // 🔥 차단 처리
  const handleBlock = async () => {
    if (isMine) {
      alert("자기 자신을 차단할 수 없습니다.");
      return;
    }

    if (!confirm(`${senderId}님을 차단하시겠습니까?\n차단된 사용자의 메시지는 더 이상 보이지 않습니다.`)) {
      return;
    }

    try {
      await blockUser({
        myUid,
        targetUid: senderId,
      });
      alert("차단되었습니다.");
      onBlock?.();
      onClose();
    } catch (error: any) {
      console.error("❌ [MessageMenu] 차단 실패:", error);
      alert("차단에 실패했습니다: " + (error.message || "알 수 없는 오류"));
    }
  };

  // 🔥 신고 처리
  const handleReport = async () => {
    if (isMine) {
      alert("자기 자신을 신고할 수 없습니다.");
      return;
    }

    if (!reportType) {
      alert("신고 유형을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await reportMessage({
        reporter: myUid,
        targetUid: senderId,
        roomId,
        messageId,
        type: reportType,
        text: reportText || undefined,
      });
      alert("신고가 접수되었습니다.\n검토 후 조치하겠습니다.");
      setShowReportDialog(false);
      onClose();
    } catch (error: any) {
      console.error("❌ [MessageMenu] 신고 실패:", error);
      alert("신고에 실패했습니다: " + (error.message || "알 수 없는 오류"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showReportDialog) {
    return (
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          zIndex: 10002,
          minWidth: 320,
          maxWidth: 400,
        }}
      >
        <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 600 }}>
          신고하기
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
            신고 유형
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            <option value="spam">스팸</option>
            <option value="abuse">욕설/비방</option>
            <option value="harassment">괴롭힘</option>
            <option value="fraud">사기</option>
            <option value="inappropriate">부적절한 내용</option>
            <option value="etc">기타</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
            상세 내용 (선택)
          </label>
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="신고 사유를 자세히 적어주세요"
            rows={4}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 14,
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setShowReportDialog(false)}
            style={{
              padding: "8px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleReport}
            disabled={isSubmitting}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 8,
              background: "#ef4444",
              color: "#fff",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "신고 중..." : "신고하기"}
          </button>
        </div>
      </div>
    );
  }

  if (isMine) {
    return null; // 내 메시지는 메뉴 표시 안 함
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 10001,
        minWidth: 160,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={handleBlock}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "none",
          background: "transparent",
          textAlign: "left",
          cursor: "pointer",
          fontSize: 14,
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        차단하기
      </button>
      <button
        type="button"
        onClick={() => setShowReportDialog(true)}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "none",
          borderTop: "1px solid #e5e7eb",
          background: "transparent",
          textAlign: "left",
          cursor: "pointer",
          fontSize: 14,
          color: "#ef4444",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        신고하기
      </button>
    </div>
  );
}
