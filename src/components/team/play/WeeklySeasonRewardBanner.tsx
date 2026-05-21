import { useCallback, useEffect, useState } from "react";
import {
  claimWeeklySeasonReward,
  fetchPendingWeeklySeasonRewards,
  type PendingWeeklySeasonReward,
} from "@/services/weeklySeasonRewardClient";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  authUid?: string | null;
  className?: string;
};

export default function WeeklySeasonRewardBanner({ authUid, className }: Props) {
  const [pending, setPending] = useState<PendingWeeklySeasonReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authUid?.trim()) {
      setPending([]);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const list = await fetchPendingWeeklySeasonRewards();
      setPending(list);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [authUid]);

  useEffect(() => {
    void load();
  }, [load]);

  const top = pending[0];
  const restCount = Math.max(0, pending.length - 1);

  const onClaim = async () => {
    if (!top) return;
    setClaiming(true);
    setMessage(null);
    try {
      const out = await claimWeeklySeasonReward(top.seasonId);
      if (out.alreadyClaimed) {
        setMessage("이미 수령한 보상입니다.");
      } else {
        setMessage(
          out.bonusXpGranted > 0
            ? `보상을 받았습니다 · XP +${out.bonusXpGranted}`
            : "보상을 받았습니다."
        );
      }
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "수령에 실패했습니다.");
    } finally {
      setClaiming(false);
    }
  };

  if (!authUid?.trim()) return null;
  if (loading && pending.length === 0) return null;
  if (!top) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-300/90 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/80 p-4 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-amber-950">🏆 지난 시즌 보상을 받으세요</p>
          <p className="mt-1 text-xs font-medium text-amber-900/90">
            시즌 <span className="font-mono font-bold">{top.seasonId}</span> · 순위{" "}
            <span className="font-bold">{top.rank}</span>위 · 티어{" "}
            <span className="font-bold capitalize">{top.tier}</span>
            {restCount > 0 ? (
              <span className="text-amber-800/80"> · 외 {restCount}건 미수령</span>
            ) : null}
          </p>
          {message ? <p className="mt-2 text-xs font-semibold text-emerald-800">{message}</p> : null}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={claiming}
          onClick={() => void onClaim()}
          className="shrink-0 bg-amber-600 font-bold text-white hover:bg-amber-500"
        >
          {claiming ? "처리 중…" : "보상 받기"}
        </Button>
      </div>
    </div>
  );
}
