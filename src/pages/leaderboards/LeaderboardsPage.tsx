import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import { IdentityHeader } from "@/components/ui/layout/IdentityHeader";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import {
  callGetLeaderboards,
  labelArchetype,
  weeklyBadgeEmoji,
  weeklyBadgeEmojiForRank,
  weeklyBadgeLabel,
  weeklyChallengeLabelKo,
} from "@/lib/telemetry/leaderboardClient";
import type {
  LeaderboardEntryClient,
  LeaderboardScopeClient,
  LeaderboardsClient,
  WeeklyMetaClient,
} from "@/lib/telemetry/leaderboardTypes";

type TabId = LeaderboardScopeClient;

const TABS: { id: TabId; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "friends", label: "Friends" },
  { id: "weekly", label: "Weekly" },
];

function BoardCard({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          {emoji}
        </span>
        <h2 className="text-sm font-black uppercase tracking-wide text-gray-800">{title}</h2>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ScoreRow({
  entry,
  valueLabel,
  showWeeklyBadge,
}: {
  entry: LeaderboardEntryClient;
  valueLabel: string;
  showWeeklyBadge?: boolean;
}) {
  const badgeEmoji = showWeeklyBadge ? weeklyBadgeEmojiForRank(entry.rank) : "";
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 py-2 last:border-b-0">
      <span className="w-6 shrink-0 text-center font-mono text-xs font-bold text-gray-400">
        {badgeEmoji || entry.rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{entry.displayName}</p>
        <p className="text-[10px] text-gray-500">{labelArchetype(entry.archetype)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-bold tabular-nums text-cyan-700">{entry.score}</p>
        <p className="text-[9px] uppercase tracking-wide text-gray-400">{valueLabel}</p>
      </div>
    </div>
  );
}

function WeeklyLadderPanel({ meta }: { meta: WeeklyMetaClient }) {
  return (
    <section className="rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white px-3.5 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-black text-gray-900">🏆 Weekly Ladder</p>
          <p className="mt-0.5 text-xs font-semibold text-violet-700">{meta.countdown.label}</p>
          <p className="text-[10px] text-gray-500">{meta.weekKey}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-violet-100 bg-white px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Your Rank</p>
          <p className="mt-0.5 font-mono text-lg font-black text-gray-900">
            {meta.currentUserRank != null ? `#${meta.currentUserRank}` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-violet-100 bg-white px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Badge</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">
            {meta.badge ? `${weeklyBadgeEmoji(meta.badge)} ${weeklyBadgeLabel(meta.badge)}` : "—"}
          </p>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Challenge</p>
        <p className="mt-0.5 text-sm font-bold text-amber-900">{weeklyChallengeLabelKo(meta.challenge)}</p>
      </div>
    </section>
  );
}

function EmptyBoard() {
  return <p className="py-3 text-xs text-gray-500">아직 랭킹 데이터가 없습니다.</p>;
}

export default function LeaderboardsPage() {
  const [tab, setTab] = useState<TabId>("global");
  const [boards, setBoards] = useState<LeaderboardsClient | null>(null);
  const [weeklyMeta, setWeeklyMeta] = useState<WeeklyMetaClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await callGetLeaderboards(tab);
        if (!cancelled) {
          setBoards(data.leaderboards);
          setWeeklyMeta(data.weeklyMeta);
        }
      } catch {
        if (!cancelled) setError("리더보드를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const tabDescription =
    tab === "friends"
      ? "팔로우한 플레이어 · Season RP Top 10"
      : tab === "weekly"
        ? "이번 주 Weekly RP · urgency + prestige"
        : "Top 10 · 프로필 기반 · 실시간 집계";

  const content = (
    <div className="mx-auto w-full max-w-lg space-y-3 px-1 pb-4">
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
        <Trophy className="h-5 w-5 text-amber-600" aria-hidden />
        <div>
          <p className="text-sm font-bold text-gray-900">Player Intelligence Rankings</p>
          <p className="text-[10px] text-gray-500">{tabDescription}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-wide ${
              tab === t.id ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          랭킹 불러오는 중…
        </div>
      ) : error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error}
        </p>
      ) : boards ? (
        <>
          {tab === "weekly" && weeklyMeta ? <WeeklyLadderPanel meta={weeklyMeta} /> : null}

          {tab === "global" ? (
            <>
              <BoardCard title="Top OVR" emoji="🏆">
                {boards.topOVR.length > 0 ? (
                  boards.topOVR.map((e) => <ScoreRow key={e.uid} entry={e} valueLabel="OVR" />)
                ) : (
                  <EmptyBoard />
                )}
              </BoardCard>
              <BoardCard title="Top xThreat" emoji="⚡">
                {boards.topXThreat.length > 0 ? (
                  boards.topXThreat.map((e) => <ScoreRow key={e.uid} entry={e} valueLabel="xT/m" />)
                ) : (
                  <EmptyBoard />
                )}
              </BoardCard>
              <BoardCard title="Best Finisher" emoji="🎯">
                {boards.bestFinisher.length > 0 ? (
                  boards.bestFinisher.map((e) => <ScoreRow key={e.uid} entry={e} valueLabel="FIN" />)
                ) : (
                  <EmptyBoard />
                )}
              </BoardCard>
              <BoardCard title="Best Playmaker" emoji="🧠">
                {boards.bestPlaymaker.length > 0 ? (
                  boards.bestPlaymaker.map((e) => <ScoreRow key={e.uid} entry={e} valueLabel="PM" />)
                ) : (
                  <EmptyBoard />
                )}
              </BoardCard>
              <BoardCard title="Season RP" emoji="🏅">
                {boards.seasonRP.length > 0 ? (
                  boards.seasonRP.map((e) => <ScoreRow key={e.uid} entry={e} valueLabel="RP" />)
                ) : (
                  <EmptyBoard />
                )}
              </BoardCard>
            </>
          ) : null}

          {tab === "friends" ? (
            <BoardCard title="Friends Season RP" emoji="👥">
              {boards.seasonRP.length > 0 ? (
                boards.seasonRP.map((e) => <ScoreRow key={e.uid} entry={e} valueLabel="RP" />)
              ) : (
                <EmptyBoard />
              )}
            </BoardCard>
          ) : null}

          {tab === "weekly" ? (
            <BoardCard title="Weekly RP" emoji="📅">
              {boards.weeklyRP.length > 0 ? (
                boards.weeklyRP.map((e) => (
                  <ScoreRow key={e.uid} entry={e} valueLabel="RP" showWeeklyBadge />
                ))
              ) : (
                <EmptyBoard />
              )}
            </BoardCard>
          ) : null}
        </>
      ) : (
        <p className="text-center text-sm text-gray-500">리더보드 데이터 없음</p>
      )}
    </div>
  );

  return (
    <HubLayout
      header={<IdentityHeader title="리더보드" subtitle="Player Intelligence Rankings" />}
      persona={content}
    />
  );
}
