/**
 * 공지 관리 액션바 컴포넌트
 * 
 * 원칙:
 * - 관리자 전용
 * - 행정 모드 ON일 때 표시
 * - 주요 관리 액션 제공
 */

interface NoticeAdminActionBarProps {
  associationId: string;
  onNewNotice?: () => void;
}

export function NoticeAdminActionBar({ associationId, onNewNotice }: NoticeAdminActionBarProps) {
  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("[NoticeAdminActionBar] NEW clicked"); // ✅
                onNewNotice?.();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
            >
              <span>➕</span>
              <span>공지 등록</span>
            </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // TODO: 고정 관리 모달 열기
            console.log("고정 관리");
          }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
        >
          <span>📌</span>
          <span>고정 관리</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // TODO: 초안 보기 필터 적용
            console.log("초안 보기");
          }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
        >
          <span>📄</span>
          <span>초안 보기</span>
        </button>
      </div>
    </div>
  );
}

