/**
 * 대진표 상태 컴포넌트
 * 
 * 원칙:
 * - bracketStatus === 'confirmed' → "대진표 확정 (공식)"
 * - 그 외 → "대진표 준비중"
 */

import type { BracketStatus as BracketStatusType } from "@/types/tournament";

interface BracketStatusProps {
  status: BracketStatusType;
}

export function BracketStatus({ status }: BracketStatusProps) {
  if (status === "confirmed") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">대진표 확정 (공식)</span>
        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
          ✓ 공식
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">대진표 준비중</span>
      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
        준비중
      </span>
    </div>
  );
}

