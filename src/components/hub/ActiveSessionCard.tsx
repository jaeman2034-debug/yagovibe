import * as React from "react";

// Firestore Timestamp(최소 호환)까지 고려한 타입
type TimestampLike =
  | Date
  | number // epoch ms
  | { toDate: () => Date }; // Firestore Timestamp

export type ActiveSession = {
  id: string;
  sport: "soccer" | "basketball" | "running" | "tennis" | string;
  sportLabel?: string; // "축구" 같은 표시용
  locationLabel: string; // "가능동"
  startedAt: TimestampLike; // 시작 시간
  status: "active"; // 카드 자체는 active 전용
};

type Props = {
  session: ActiveSession;

  // 라우팅/액션은 상위에서 주입: UI는 선언, 행동은 외부로
  onFindTeam: (session: ActiveSession) => void;
  onViewVenues: (session: ActiveSession) => void;
  onEndSession: (session: ActiveSession) => void;

  className?: string;
};

function toDateSafe(v: TimestampLike): Date {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (v && typeof v === "object" && "toDate" in v && typeof v.toDate === "function") {
    return v.toDate();
  }
  // fallback (예상 밖)
  return new Date();
}

function formatTimeAgo(from: Date, now = new Date()): string {
  const diffMs = now.getTime() - from.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  const min = Math.floor(sec / 60);
  if (min < 1) return "방금 시작";
  if (min < 60) return `${min}분 전 시작`;
  const hr = Math.floor(min / 60);
  return `${hr}시간 전 시작`;
}

function formatElapsed(from: Date, now = new Date()): string {
  const diffMs = Math.max(0, now.getTime() - from.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  const mmStr = String(mm).padStart(2, "0");
  const ssStr = String(ss).padStart(2, "0");
  return `${mmStr}:${ssStr}`;
}

function sportEmoji(sport: string) {
  switch (sport) {
    case "soccer":
      return "🔥";
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

function sportDefaultLabel(sport: string) {
  switch (sport) {
    case "soccer":
      return "축구";
    case "basketball":
      return "농구";
    case "running":
      return "러닝";
    case "tennis":
      return "테니스";
    default:
      return sport;
  }
}

/**
 * ActiveSessionCard
 * - "지금 나는 운동 중이다"를 선언하는 카드
 * - 위치+시간으로 신뢰감을 주고
 * - 3개의 핵심 액션으로 다음 행동을 즉시 유도
 */
export function ActiveSessionCard({
  session,
  onFindTeam,
  onViewVenues,
  onEndSession,
  className,
}: Props) {
  const startedAt = React.useMemo(() => toDateSafe(session.startedAt), [session.startedAt]);
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    // 타이머는 1초 단위(부하 낮고 충분히 체감됨)
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const emoji = sportEmoji(session.sport);
  const label = session.sportLabel ?? sportDefaultLabel(session.sport);
  const timeAgo = formatTimeAgo(startedAt, now);
  const elapsed = formatElapsed(startedAt, now);

  return (
    <section
      className={[
        "w-full rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
        className ?? "",
      ].join(" ")}
      aria-label="현재 진행 중인 세션"
    >
      {/* StatusHeader */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-snug">
            {emoji} 지금 {label} 활동 중
          </div>
          {/* LocationInfo */}
          <div className="mt-2 text-sm text-neutral-600">
            {session.locationLabel} · {timeAgo}
          </div>
        </div>

        {/* SessionTimer */}
        <div className="shrink-0 rounded-xl bg-neutral-50 px-3 py-2 text-sm font-medium tabular-nums text-neutral-800">
          {elapsed}
        </div>
      </header>

      {/* ActionButtons */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onFindTeam(session)}
          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-800 active:scale-[0.99]"
        >
          팀 찾기
          <div className="mt-1 text-xs font-normal text-blue-700/80">
            같이 할 사람 탐색
          </div>
        </button>

        <button
          type="button"
          onClick={() => onViewVenues(session)}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800 active:scale-[0.99]"
        >
          장소 보기
          <div className="mt-1 text-xs font-normal text-emerald-700/80">
            근처 장소 지도
          </div>
        </button>

        <button
          type="button"
          onClick={() => onEndSession(session)}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-800 active:scale-[0.99]"
        >
          종료
          <div className="mt-1 text-xs font-normal text-rose-700/80">
            세션 종료
          </div>
        </button>
      </div>
    </section>
  );
}
