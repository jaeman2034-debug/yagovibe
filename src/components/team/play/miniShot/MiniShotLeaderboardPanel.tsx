import { useMiniShotLeaderboard } from "@/hooks/useMiniShotLeaderboard";
import { cn } from "@/lib/utils";
import SuperStrikerBadge from "@/components/team/play/SuperStrikerBadge";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

type Props = {
  teamId?: string;
  viewerUid?: string | null;
  /** 세션 종료 화면 등에서만 켜기 — 구독·쿼리 절약 */
  enabled?: boolean;
};

export default function MiniShotLeaderboardPanel({ teamId, viewerUid, enabled = true }: Props) {
  const { topRows, loadingTop, myRank, myBestScore, myRankInTop, error, topLimit } =
    useMiniShotLeaderboard(teamId, viewerUid, { enabled: enabled && !!teamId?.trim() });

  if (!teamId?.trim()) {
    return null;
  }

  return (
    <div className="pointer-events-auto mt-1 w-full max-w-sm rounded-2xl border border-amber-400/25 bg-slate-950/80 p-3 text-left shadow-lg ring-1 ring-white/10 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-amber-200/95">팀 미니슛 랭킹</h4>
        <span className="text-[10px] font-semibold text-white/45">best 점수 · 상위 {topLimit}</span>
      </div>

      {error ? (
        <p className="text-center text-[11px] text-rose-300/90">랭킹을 불러오지 못했습니다.</p>
      ) : loadingTop && topRows.length === 0 ? (
        <ul className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="flex animate-pulse items-center gap-2 rounded-xl bg-white/5 px-2 py-2"
            >
              <div className="h-8 w-8 rounded-full bg-white/10" />
              <div className="h-3 flex-1 rounded bg-white/10" />
              <div className="h-5 w-10 rounded bg-white/10" />
            </li>
          ))}
        </ul>
      ) : topRows.length === 0 ? (
        <p className="py-2 text-center text-[11px] text-white/55">아직 기록이 없어요. 한 판 완료하면 여기에 올라와요.</p>
      ) : (
        <ul className="max-h-[220px] space-y-1 overflow-y-auto pr-0.5">
          {topRows.map((row) => {
            const isMe = viewerUid?.trim() === row.userId;
            const medal = row.rank <= 3 ? MEDALS[row.rank - 1] : null;
            return (
              <li
                key={row.userId}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-sm transition-colors",
                  isMe
                    ? "border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-amber-600/10 shadow-md shadow-amber-900/20"
                    : "border-white/10 bg-white/[0.06]"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums",
                    row.rank === 1 && "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
                    row.rank === 2 && "bg-gradient-to-br from-slate-400 to-slate-600 text-white",
                    row.rank === 3 && "bg-gradient-to-br from-amber-800 to-amber-950 text-amber-100",
                    row.rank > 3 && "bg-slate-800 text-slate-200"
                  )}
                >
                  <span className="sr-only">{row.rank}위</span>
                  <span aria-hidden className="tabular-nums">
                    {medal ?? row.rank}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{row.displayName}</p>
                  <div className="mt-1">
                    <SuperStrikerBadge compact count={row.superBadgeCount} className="border-amber-300/70 bg-amber-200/10 text-amber-100" />
                  </div>
                  {isMe ? (
                    <p className="text-[10px] font-medium text-amber-200/80">나</p>
                  ) : null}
                </div>
                <p className="shrink-0 text-base font-black tabular-nums text-amber-200">{row.bestScore}</p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 border-t border-white/10 pt-2">
        {viewerUid?.trim() && myBestScore != null && myRank != null ? (
          <p className="text-center text-[11px] text-white/80">
            <span className="text-white/50">내 순위</span>{" "}
            <span className="font-bold text-amber-200">{myRank}위</span>
            <span className="text-white/40"> · </span>
            <span className="font-semibold text-white">{myBestScore}점</span>
            {myRankInTop != null && myRankInTop <= topLimit ? (
              <span className="ml-1 text-[10px] text-emerald-300/90">(Top {topLimit} 표시 중)</span>
            ) : myRank != null && myRank > topLimit ? (
              <span className="ml-1 text-[10px] text-white/45">(Top {topLimit} 밖)</span>
            ) : null}
          </p>
        ) : viewerUid?.trim() ? (
          <p className="text-center text-[11px] text-white/50">이 팀에서 아직 미니슛 기록이 없어요.</p>
        ) : (
          <p className="text-center text-[11px] text-white/50">로그인하면 내 순위가 표시됩니다.</p>
        )}
      </div>
    </div>
  );
}
