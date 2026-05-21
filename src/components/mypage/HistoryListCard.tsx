/**
 * 🔥 HistoryListCard - 활동 기록 목록 카드
 * 
 * 역할:
 * - 전체 활동 기록을 시간순으로 표시
 * - 스포츠 종목, 운동 시간, 날짜 표시
 * - 마이페이지에서 기록 관리
 * 
 * UX 목적:
 * - 허브 = 동기, 마이페이지 = 관리 역할 분리
 * - 사용자가 자신의 활동을 한눈에 확인
 */

import { getSportLabel, getSportIcon } from "@/constants/sports";
import type { ActivityHistoryItem } from "@/hooks/useHistoryList";

type Props = {
  list: ActivityHistoryItem[];
  loading?: boolean;
};

/**
 * 🔥 날짜 포맷팅 (2026.02.17 20:31 형식)
 */
function formatDate(ts: any): string {
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
}

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
 * 🔥 HistoryListCard 컴포넌트
 * 
 * 활동 기록 목록을 표시하는 카드
 */
export function HistoryListCard({ list, loading }: Props) {
  if (loading) {
    return (
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-2 font-semibold text-sm text-neutral-700">내 활동 기록</div>
        <div className="text-sm text-neutral-500">로딩 중...</div>
      </div>
    );
  }

  if (!list || list.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
        <div className="mb-2 font-semibold text-neutral-700">내 활동 기록</div>
        <div>기록이 없습니다</div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 font-semibold text-sm text-neutral-700">내 활동 기록</div>

      <div className="space-y-3">
        {list.map((item) => {
          const emoji = sportEmoji(item.sport);
          const label = getSportLabel(item.sport);
          const date = formatDate(item.endedAt);

          return (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm text-neutral-800 py-1 border-b border-neutral-100 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{emoji}</span>
                <span>
                  {label} · {item.durationMin}분
                </span>
              </div>
              <div className="text-xs text-neutral-500">{date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
