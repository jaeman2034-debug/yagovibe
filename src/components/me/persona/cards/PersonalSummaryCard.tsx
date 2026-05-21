/**
 * 🔥 PersonalSummaryCard - 이번 달 훈련 요약 (STEP 9: variant="summary")
 * 
 * STEP 9 디자인 시스템:
 * - variant: summary (상태 요약, 숫자 강조, 행동 유도 없음)
 * - PersonaSection 전용
 */
import { Calendar, TrendingUp } from "lucide-react";
import { MeCard } from "@/components/me/MeCard";

interface PersonalSummaryCardProps {
  month?: string;
  sessionCount?: number;
  totalMinutes?: number;
}

/**
 * 🔥 이번 달 훈련 요약 카드
 * 
 * PR 4 설계 원칙:
 * - 기록 없으면 "곧 기록이 쌓여요" 표시
 * - Empty State ❌ / "아직 ~가 없습니다" ❌
 * - props 없이도 렌더링 가능 (기본값 사용)
 */
export function PersonalSummaryCard({
  month,
  sessionCount = 0,
  totalMinutes = 0,
}: PersonalSummaryCardProps = {}) {
  // PR 4: 기본값 보장 (데이터 없어도 항상 렌더링)
  const currentMonth = month || new Date().toLocaleDateString("ko-KR", { month: "long" });
  const hasRecords = sessionCount > 0 || totalMinutes > 0;

  return (
    <MeCard
      variant="summary"
      icon={<Calendar className="w-5 h-5" />}
      title="이번 달 훈련 요약"
    >
      {/* 요약 정보 */}
      {hasRecords ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">훈련 세션</span>
            <span className="text-lg font-bold text-gray-900">{sessionCount}회</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">총 훈련 시간</span>
            <span className="text-lg font-bold text-gray-900">{totalMinutes}분</span>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>활발한 활동 중이에요</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm text-gray-600">
            곧 기록이 쌓여요
          </p>
          <p className="text-xs text-gray-500 mt-1">
            훈련 기록을 추가하면 여기에 표시됩니다
          </p>
        </div>
      )}
    </MeCard>
  );
}
