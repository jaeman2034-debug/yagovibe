/**
 * 🔥 WeeklyBarChartCard - 주간 활동 막대 그래프 카드
 * 
 * 역할:
 * - 이번 주 요일별 운동 시간을 막대 그래프로 표시
 * - Tailwind만 사용 (가볍고 모바일 친화적)
 * - 시각적 패턴 인식 UI
 * 
 * UX 목적:
 * - 사용자가 "내 활동이 쌓인다" 느낌
 * - "그래프가 생긴다" 시각적 만족감
 * - "계속 쓰고 싶다" 리텐션 증가
 */

type Props = {
  data: number[]; // [일, 월, 화, 수, 목, 금, 토] (분 단위)
};

/**
 * 🔥 WeeklyBarChartCard 컴포넌트
 * 
 * 주간 활동 막대 그래프를 표시하는 카드
 */
export function WeeklyBarChartCard({ data }: Props) {
  const labels = ["일", "월", "화", "수", "목", "금", "토"];
  
  // 🔥 최대값 계산 (0으로 나누기 방지)
  const max = Math.max(...data, 1);

  // 🔥 데이터가 없으면 표시하지 않음
  if (!data || !data.some((v) => v > 0)) return null;

  return (
    <div className="mt-4 w-full rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-neutral-700">
        이번 주 활동
      </div>

      <div className="flex items-end justify-between gap-2 h-28">
        {data.map((v, i) => {
          // 🔥 막대 높이 계산 (최대값 대비 비율)
          const heightPercent = max > 0 ? (v / max) * 100 : 0;

          return (
            <div key={i} className="flex flex-col items-center w-full">
              {/* 🔥 분 수 표시 */}
              <div className="text-xs mb-1 text-neutral-600 font-medium">
                {v}
              </div>

              {/* 🔥 막대 그래프 컨테이너 */}
              <div className="w-3 bg-neutral-200 rounded-full h-20 flex items-end relative">
                {/* 🔥 실제 막대 (높이 비율로 계산) */}
                <div
                  className="w-3 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ height: `${heightPercent}%` }}
                />
              </div>

              {/* 🔥 요일 라벨 */}
              <div className="text-xs mt-1 text-neutral-500">
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
