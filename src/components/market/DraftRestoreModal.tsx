/**
 * 🔥 Draft 복원 모달
 * write 페이지 진입 시 draft가 있으면 표시
 */

import { FileText, X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { MarketDraft } from "@/services/marketDraftService";

interface DraftRestoreModalProps {
  draft: MarketDraft;
  isOpen: boolean;
  onRestore: () => void;
  onNew: () => void;
  onClose: () => void;
}

export default function DraftRestoreModal({
  draft,
  isOpen,
  onRestore,
  onNew,
  onClose,
}: DraftRestoreModalProps) {
  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[13000] flex items-center justify-center p-4"
      onClick={onClose}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: "slide-up 0.3s ease-out",
        }}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">작성 중인 글이 있어요</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 내용 */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            {formatDate(draft.updatedAt)}에 작성하던 글이 있습니다.
          </p>
          
          {/* Draft 미리보기 */}
          {draft.title && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">제목</p>
              <p className="text-sm text-gray-700 truncate">{draft.title}</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={onRestore}
              className={cn(
                "flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl",
                "hover:bg-blue-700 active:scale-[0.98] transition-all"
              )}
            >
              이어서 작성
            </button>
            <button
              onClick={onNew}
              className={cn(
                "flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl",
                "hover:bg-gray-200 active:scale-[0.98] transition-all"
              )}
            >
              새로 작성
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // 🔥 Portal로 body에 직접 렌더링
  if (typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
