/**
 * 공식 시스템 배지 컴포넌트
 * 
 * Sprint 8: 공식 시스템화 & 첫 접속 UX
 * 
 * 원칙:
 * - 아이콘/컬러 절제
 * - 클릭 없음 (설명 페이지 ❌)
 * - 전면 고정
 */

interface OfficialSystemBadgeProps {
  variant?: "header" | "footer";
}

export function OfficialSystemBadge({ variant = "footer" }: OfficialSystemBadgeProps) {
  const text = "✔ 본 페이지는 협회 공식 시스템 기준입니다.";

  if (variant === "header") {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <p className="text-xs text-blue-700 text-center font-medium">
          {text}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <p className="text-sm text-gray-500 text-center">
        {text}
      </p>
    </div>
  );
}

