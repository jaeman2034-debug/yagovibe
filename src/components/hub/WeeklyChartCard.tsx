/**
 * 🔥 WeeklyChartCard - 주간 활동 그래프 카드
 * 
 * 역할:
 * - 이번 주 요일별 운동 시간 표시
 * - 일요일부터 토요일까지 7일 데이터
 * - 텍스트 기반 간단한 UI
 * 
 * UX 목적:
 * - 사용자가 "내 활동이 쌓인다" 느낌
 * - 앱이 기록 앱에서 습관 앱으로 전환
 * - 리텐션 핵심 기능
 */

type Props = {
  data: number[]; // [일, 월, 화, 수, 목, 금, 토] (분 단위)
};

/**
 * 🔥 WeeklyChartCard 컴포넌트
 * 
 * 주간 활동 그래프를 표시하는 카드
 */
export function WeeklyChartCard({ data }: Props) {
  const labels = ["일", "월", "화", "수", "목", "금", "토"];

  // 🔥 데이터가 없으면 표시하지 않음
  if (!data || !data.some((v) => v > 0)) return null;

  return (
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold text-neutral-700">
        이번 주 활동
      </div>
      <div className="space-y-1 text-sm text-neutral-800">
        {data.map((v, i) => (
          <div key={i} className="flex items-center justify-between">
            <span>{labels[i]}</span>
            <span className="font-medium">{v}분</span>
          </div>
        ))}
      </div>
    </div>
  );
}
