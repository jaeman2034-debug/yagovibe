/**
 * 대진표 확정 버튼 컴포넌트 (Admin 전용)
 * 
 * 가장 중요:
 * - Admin UI에서 [대진표 확정] 버튼 클릭
 * - bracketStatus = 'confirmed'
 * - Public 화면에서 "공식 대진표" 표시
 * - "카톡으로 받은 대진표" 무력화
 */

import type { BracketStatus } from "@/types/tournament";

interface BracketConfirmButtonProps {
  currentStatus: BracketStatus;
  onConfirm: () => void;
  loading?: boolean;
}

export function BracketConfirmButton({
  currentStatus,
  onConfirm,
  loading = false,
}: BracketConfirmButtonProps) {
  if (currentStatus === "confirmed") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-green-700 font-medium">✓ 공식 대진표 확정됨</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-700 mb-2">
          대진표를 업로드/생성한 후 확정 버튼을 클릭하세요.
        </p>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "확정 중..." : "대진표 확정"}
        </button>
      </div>
    </div>
  );
}

