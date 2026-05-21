/**
 * 🔥 MySportProfileCard - 내 종목 정보 카드 (STEP 9: variant="info")
 * 
 * STEP 9 디자인 시스템:
 * - variant: info (기본 정보, 중립적, CTA 없음)
 * - PersonaSection 전용
 */
import { Trophy } from "lucide-react";
import { MeCard } from "@/components/me/MeCard";

interface MySportProfileCardProps {
  sport?: string | null;
  level?: string | null;
  goal?: string | null;
  onClick?: () => void;
}

/**
 * 🔥 내 종목 정보 카드
 * 
 * PR 4 설계 원칙:
 * - CTA 없음, 카드 클릭으로 자연스럽게 설정
 * - "없음" 대신 "설정해보세요" 문구
 * - props 없이도 렌더링 가능 (기본값 사용)
 */
export function MySportProfileCard({
  sport,
  level,
  goal,
  onClick,
}: MySportProfileCardProps = {}) {
  // PR 4: 기본값 보장 (데이터 없어도 항상 렌더링)
  const sportLabel = sport ?? "종목을 설정해보세요";
  const levelLabel = level ?? "레벨 미설정";
  const goalLabel = goal ?? "목표를 추가해보세요";

  return (
    <MeCard
      variant="info"
      icon={<Trophy className="w-5 h-5" />}
      title="내 종목"
      onClick={onClick}
      className={onClick ? "cursor-pointer hover:border-blue-300 transition-colors" : ""}
    >
      {/* 종목 태그 */}
      <div className="mb-2">
        <span
          className={`inline-block px-3 py-1 rounded-full text-sm ${
            sport
              ? "bg-blue-100 text-blue-700 font-medium"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {sportLabel}
        </span>
      </div>

      {/* 레벨 */}
      <div className="text-sm text-gray-700 mb-2">
        {levelLabel}
      </div>

      {/* 목표 */}
      <div className="text-sm text-gray-600">
        {goalLabel}
      </div>
    </MeCard>
  );
}
