import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppCard } from "@/components/ui/AppCard";
import { useMatches } from "@/hooks/useMatches";
import { resolveLastSportId } from "@/utils/sportHubHref";
import { isSportTypeSlug } from "@/types/sport";
import { toDate } from "@/utils/timeUtils";
import type { Match } from "@/types/match";

function formatWhen(m: Match): string {
  try {
    const d = toDate(m.date);
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" });
  } catch {
    return "";
  }
}

/** ACTIVE — 오픈 매칭 몇 건만 스트립 */
export function SportsHubRecentMatchesStrip() {
  const navigate = useNavigate();
  const raw = resolveLastSportId();
  const sport = isSportTypeSlug(raw) ? raw : undefined;

  const { matches, loading, error } = useMatches({
    status: "open",
    sport,
    limit: 12,
  });

  const list = useMemo(() => {
    const now = Date.now();
    return [...matches]
      .filter((m) => {
        try {
          return toDate(m.date).getTime() >= now - 86400000;
        } catch {
          return true;
        }
      })
      .slice(0, 4);
  }, [matches]);

  if (loading) {
    return (
      <AppCard className="mb-6">
        <p className="text-sm text-gray-500">최근 경기 불러오는 중…</p>
      </AppCard>
    );
  }

  if (error || list.length === 0) {
    return null;
  }

  return (
    <AppCard className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">열린 매칭</h3>
        <button
          type="button"
          onClick={() => navigate(`/match?sport=${encodeURIComponent(sport || raw)}`)}
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          전체 보기
        </button>
      </div>
      <ul className="space-y-2">
        {list.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => navigate(`/match/${encodeURIComponent(m.id)}`)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-left text-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800"
            >
              <span className="truncate font-medium text-gray-900 dark:text-gray-100">{m.teamName}</span>
              <span className="ml-2 shrink-0 text-xs text-gray-500">{formatWhen(m)}</span>
            </button>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}
