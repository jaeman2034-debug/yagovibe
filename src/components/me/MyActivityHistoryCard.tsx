/**
 * 🔥 MyActivityHistoryCard - 마이페이지 활동 기록 카드
 * 
 * 역할:
 * - 사용자의 최근 활동 기록 20개 표시
 * - 날짜, 스포츠 종목, 운동 시간 표시
 * - 실시간 업데이트
 * 
 * UX 목적:
 * - 마이페이지에서 전체 기록 확인
 * - 허브 = 동기, 마이페이지 = 관리 역할 분리
 */

import { useHistoryList } from "@/hooks/useHistoryList";
import { useAuth } from "@/context/AuthProvider";
import { getSportLabel } from "@/constants/sports";
import { useNavigate } from "react-router-dom";

/**
 * 🔥 날짜 포맷팅 (2026.02.17 20:31 형식)
 */
const formatDate = (ts: any): string => {
  if (!ts) return "";
  
  let d: Date | null = null;
  
  if (ts.toDate && typeof ts.toDate === "function") {
    d = ts.toDate();
  } else if (ts instanceof Date) {
    d = ts;
  } else if (ts.seconds) {
    d = new Date(ts.seconds * 1000);
  }
  
  if (!d) return "";
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  
  return `${year}.${month}.${date} ${hours}:${minutes}`;
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
 * 🔥 MyActivityHistoryCard 컴포넌트
 */
export default function MyActivityHistoryCard() {
  const { user } = useAuth();
  const { items, loading } = useHistoryList(user?.uid);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
        <div className="text-sm text-neutral-500">기록 불러오는 중...</div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
        <h3 className="font-semibold mb-2 text-sm text-neutral-700">내 활동 기록</h3>
        <div className="text-sm text-neutral-500">아직 활동 기록이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
      <h3 className="font-semibold mb-3 text-sm text-neutral-700">내 활동 기록</h3>

      <div className="space-y-2">
        {items.map((item) => {
          const emoji = sportEmoji(item.sport);
          const label = getSportLabel(item.sport);
          const date = formatDate(item.endedAt);

          return (
            <div
              key={item.id}
              onClick={() => navigate(`/me/activity/${item.id}`)}
              className="flex justify-between items-center p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{emoji}</span>
                <div>
                  <div className="font-medium text-sm text-neutral-800">
                    {label}
                  </div>
                  <div className="text-xs text-neutral-500">{date}</div>
                </div>
              </div>

              <div className="text-sm font-semibold text-neutral-800">
                {item.durationMin}분
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
