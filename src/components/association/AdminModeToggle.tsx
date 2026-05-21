/**
 * 행정 모드 토글 컴포넌트
 * 
 * 원칙:
 * - 관리자 권한일 때만 표시
 * - 일반 보기 / 행정 모드 전환
 * - 행정 모드 ON 시 UI 확장 (버튼, 상태 필드 등)
 */

interface AdminModeToggleProps {
  isAdminMode: boolean;
  onToggle: (enabled: boolean) => void;
}

export function AdminModeToggle({ isAdminMode, onToggle }: AdminModeToggleProps) {
  return (
    <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1 bg-white">
      <button
        onClick={() => onToggle(false)}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          !isAdminMode
            ? "bg-blue-600 text-white font-medium"
            : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        일반 보기
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1 ${
          isAdminMode
            ? "bg-blue-600 text-white font-medium"
            : "text-gray-600 hover:bg-gray-50"
        }`}
      >
        <span>🔒</span>
        <span>행정 모드</span>
      </button>
    </div>
  );
}

