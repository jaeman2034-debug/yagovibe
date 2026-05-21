/**
 * 공지 Empty State 컴포넌트
 * 
 * 원칙:
 * - 전화/문의 유발 요소 절대 없음
 * - 공식 기준 명시
 * - 행정 모드일 때 "새 공지 등록" 버튼 표시 (Drawer 방식)
 */

import { EmptyState } from "@/components/common/EmptyState";

interface NoticeEmptyStateProps {
  associationId?: string;
  isAdminMode?: boolean;
  onNewNotice?: () => void; // Drawer 열기 콜백
}

export function NoticeEmptyState({ associationId, isAdminMode = false, onNewNotice }: NoticeEmptyStateProps) {
  return (
    <div className="space-y-4">
      <EmptyState
        title="현재 등록된 공지가 없습니다."
        description="공지 사항은 본 페이지 기준으로 안내됩니다."
      />
      {isAdminMode && associationId && onNewNotice && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onNewNotice();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
          >
            <span>➕</span>
            <span>새 공지 등록</span>
          </button>
        </div>
      )}
    </div>
  );
}

