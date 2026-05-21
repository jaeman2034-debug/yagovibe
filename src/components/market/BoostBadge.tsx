/**
 * 🔥 부스트 배지 컴포넌트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 30분 부스트 활성 상태 표시
 * - 부스트 타이머 표시
 */

import { useEffect, useState } from "react";
import { TrendingUp, Clock } from "lucide-react";

interface BoostBadgeProps {
  boostActive?: boolean;
  boostEndTime?: Date;
  boostChatCount?: number;
}

export default function BoostBadge({
  boostActive = false,
  boostEndTime,
  boostChatCount = 0,
}: BoostBadgeProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!boostActive || !boostEndTime) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = boostEndTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("부스트 종료");
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes}분 ${seconds}초`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [boostActive, boostEndTime]);

  if (!boostActive) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
      <TrendingUp className="w-3 h-3" />
      <span>신상품 부스트</span>
      {timeLeft && (
        <>
          <span className="mx-1">•</span>
          <Clock className="w-3 h-3" />
          <span>{timeLeft}</span>
        </>
      )}
      {boostChatCount > 0 && (
        <>
          <span className="mx-1">•</span>
          <span>채팅 {boostChatCount}회</span>
        </>
      )}
    </div>
  );
}
