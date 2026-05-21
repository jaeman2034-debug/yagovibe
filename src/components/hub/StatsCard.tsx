/**
 * 🔥 StatsCard - 활동 통계 카드
 * 
 * 역할:
 * - 오늘 총 운동 시간 표시
 * - 이번 주 운동 횟수 표시
 * - 이번 주 총 운동 시간 표시
 * 
 * UX 목적:
 * - 앱 가치 3배 상승
 * - 사용자 성취감 강화
 * - 리텐션 증가
 */

type Props = {
  todayMin: number;
  weekMin: number;
  weekCount: number;
};

/**
 * 🔥 StatsCard 컴포넌트
 * 
 * 활동 통계를 표시하는 카드
 */
export function StatsCard({ todayMin, weekMin, weekCount }: Props) {
  // 🔥 통계가 없으면 표시하지 않음
  if (!weekCount && !todayMin) return null;

  return (
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold text-neutral-700">
        활동 통계
      </div>

      <div className="space-y-1 text-sm text-neutral-800">
        <div>오늘 운동 · {todayMin}분</div>
        <div>이번 주 · {weekCount}회</div>
        <div>이번 주 총 · {weekMin}분</div>
      </div>
    </div>
  );
}
