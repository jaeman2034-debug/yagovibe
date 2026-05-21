/**
 * 🔥 TodayActivityCard - 오늘 활동 카드
 * 
 * 역할:
 * - 오늘 종료된 세션들을 표시
 * - 앱이 "기억한다"는 느낌 제공
 * - 사용자 데이터 가치 상승
 * 
 * UX 목적:
 * - 재방문 이유 생성
 * - 성취감 강화
 * - 활동 기록 시각화
 */

import { getSportLabel } from "@/constants/sports";

type Props = {
  sessions: {
    id: string;
    sport: string;
    durationMin: number;
  }[];
};

/**
 * 🔥 스포츠 이모지
 */
function sportEmoji(sport: string): string {
  switch (sport) {
    case "soccer":
      return "⚽";
    case "basketball":
      return "🏀";
    case "running":
      return "🏃‍♂️";
    case "tennis":
      return "🎾";
    default:
      return "✅";
  }
}

/**
 * 🔥 TodayActivityCard 컴포넌트
 * 
 * 오늘 종료된 세션들을 표시하는 카드
 */
export function TodayActivityCard({ sessions }: Props) {
  if (!sessions.length) return null;

  return (
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-semibold text-neutral-700">
        오늘 활동
      </div>

      <div className="space-y-1">
        {sessions.map((s) => {
          const emoji = sportEmoji(s.sport);
          const label = getSportLabel(s.sport);

          return (
            <div key={s.id} className="text-sm text-neutral-800">
              {emoji} {label} · {s.durationMin}분
            </div>
          );
        })}
      </div>
    </div>
  );
}
