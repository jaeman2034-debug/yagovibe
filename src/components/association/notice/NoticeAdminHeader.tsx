/**
 * 행정 모드 전용 헤더 컴포넌트
 * 
 * 원칙:
 * - 행정 모드 ON일 때만 표시
 * - "행정 관리 화면" 명시
 * - 행정 모드 배지 고정
 */

interface NoticeAdminHeaderProps {
  title?: string;
}

export function NoticeAdminHeader({ title = "공지 관리" }: NoticeAdminHeaderProps) {
  return (
    <div className="mb-6 border-b border-gray-200 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <span className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium flex items-center gap-1">
            <span>🔒</span>
            <span>행정 모드</span>
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        행정 관리 화면 (공지 · 대회 · 대관 관리)
      </p>
      {/* 행정 모드 UX 고정 문구 (심리적 안전장치 + 책임 고지) */}
      <div className="mt-4 p-3 border border-yellow-200 rounded bg-yellow-50 text-sm text-yellow-800">
        🔒 현재 행정 관리 모드입니다. 모든 변경 사항은 공식 기록으로 저장됩니다.
      </div>
    </div>
  );
}

