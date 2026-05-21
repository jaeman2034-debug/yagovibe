/**
 * 🔥 WorkoutCompletedToast - 운동 완료 토스트
 * 
 * 역할:
 * - 세션 종료 직후 성취감 제공
 * - 운동 시간, 종목 표시
 * - 3초 후 자동 사라짐
 * 
 * UX 목적:
 * - 사용자 성취감 증가
 * - 리텐션 상승
 * - 앱 사용 의미 강화
 */

import * as React from "react";
import { getSportLabel } from "@/constants/sports";

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

type Props = {
  sport: string;
  durationMin: number;
  onDismiss?: () => void;
};

/**
 * 🔥 WorkoutCompletedToast 컴포넌트
 * 
 * 세션 종료 직후 표시되는 성취감 토스트
 */
export function WorkoutCompletedToast({ sport, durationMin, onDismiss }: Props) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    // 🔥 3초 후 자동 사라짐
    const timer = setTimeout(() => {
      setVisible(false);
      // 애니메이션 완료 후 onDismiss 호출
      setTimeout(() => {
        onDismiss?.();
      }, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) {
    return null;
  }

  const emoji = sportEmoji(sport);
  const label = getSportLabel(sport);

  return (
    <div className="mb-3 rounded-xl border bg-emerald-50 p-3 text-sm shadow animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="font-medium text-gray-900">
          🎉 오늘 운동 완료 · {label} {durationMin}분
        </span>
      </div>
    </div>
  );
}
