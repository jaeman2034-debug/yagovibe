import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPlayerProfile } from "@/lib/telemetry/matchIntelligenceClient";
import type { PlayerProfileClient } from "@/lib/telemetry/matchIntelligenceTypes";
import { formatInt } from "@/lib/telemetry/matchIntelligenceFormat";
import { YagoProPaywallStrip } from "@/components/me/YagoProPaywallStrip";
import { useGrowthConfig } from "@/hooks/useGrowthConfig";
import { registerContextualTriggerCandidate } from "@/hooks/usePaywallTrigger";

type Props = {
  uid: string;
  isPro?: boolean;
  className?: string;
};

export function SeasonRankCard({ uid, isPro = false, className = "" }: Props) {
  const [profile, setProfile] = useState<PlayerProfileClient | null>(null);
  const [loading, setLoading] = useState(true);
  const { config } = useGrowthConfig(uid);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await fetchPlayerProfile(uid);
        if (!cancelled) setProfile(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const rank = profile?.seasonRank ?? "Bronze III";
  const points = profile?.seasonPoints ?? 0;
  const wins = profile?.seasonWins ?? 0;
  const losses = profile?.seasonLosses ?? 0;
  const rankBefore = profile?.lastSeasonRankBefore?.trim() || null;
  const rankDelta = profile?.lastSeasonDelta ?? null;
  const rankImproved =
    profile?.lastSeasonPromoted === true ||
    (rankDelta != null && rankDelta > 0 && rankBefore != null && rankBefore !== rank);

  useEffect(() => {
    if (isPro || !rankImproved) return;
    registerContextualTriggerCandidate("rank_up");
  }, [isPro, rankImproved]);

  if (loading) {
    return (
      <div className={`rounded-xl border border-violet-500/30 bg-violet-950/20 px-3 py-4 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-violet-200/90">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          시즌 랭크 불러오는 중…
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="rounded-xl border border-violet-500/30 bg-gradient-to-b from-violet-950/30 to-[#070b14]/80 px-3 py-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-300/90">Current Season Rank</p>
        <p className="mt-1 text-xl font-black text-white">{rank}</p>
        <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-violet-200">{formatInt(points)} RP</p>
        <p className="mt-2 text-xs text-slate-400">
          {formatInt(wins)}W / {formatInt(losses)}L
        </p>
        {rankImproved && rankBefore ? (
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-300">
            PROMOTED · {rankBefore} → {rank}
          </p>
        ) : null}
      </div>

      {!isPro && rankImproved ? (
        <YagoProPaywallStrip
          surface="rank_up"
          trigger="rank_up"
          isPro={isPro}
          uid={uid}
          headline={
            rankBefore
              ? `${config.rank_up_headline} · ${rankBefore} → ${rank}`
              : `${config.rank_up_headline} · ${rank}`
          }
          subline={config.rank_up_subcopy}
        />
      ) : null}
    </div>
  );
}
