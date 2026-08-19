import { Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { callGetFriendsGraph } from "@/lib/social/socialGraphClient";
import type { FriendsGraphClient } from "@/lib/social/socialGraphTypes";

export function FriendsSummaryCard() {
  const [graph, setGraph] = useState<FriendsGraphClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await callGetFriendsGraph();
        if (!cancelled) setGraph(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-sky-500/30 bg-gradient-to-b from-sky-950/30 to-[#070b14]/80 px-3 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-sky-300" aria-hidden />
          <h2 className="text-base font-semibold text-white">Friends</h2>
        </div>
        <Link
          to="/friends"
          className="text-xs font-semibold text-sky-300 hover:text-sky-200 hover:underline"
        >
          Find Players
        </Link>
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-sky-200/80">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          친구 그래프 불러오는 중…
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatCell label="Following" value={graph?.meta.followingCount ?? 0} />
          <StatCell label="Followers" value={graph?.meta.followersCount ?? 0} />
          <StatCell label="Mutuals" value={graph?.meta.mutualCount ?? 0} />
        </div>
      )}

      <Link
        to="/friends"
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/20"
      >
        친구 관리
      </Link>
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center">
      <p className="font-mono text-lg font-black tabular-nums text-white">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
