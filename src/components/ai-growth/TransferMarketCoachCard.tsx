/**
 * J4-4 — Coach Dashboard Transfer Market
 */
import { useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import {
  buildTransferMarketView,
  type TransferMarketView,
} from "@/lib/ai-growth/transferMarketView";
import { appendTransferMarketLog } from "@/lib/ai-growth/transferMarketLogService";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import { cn } from "@/lib/utils";

type RosterEntry = {
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
};

type Props = {
  teamId: string;
  homeTeamLabel: string;
  focusPlayer: RosterEntry | null;
  homeRoster: RosterEntry[];
  loading?: boolean;
  className?: string;
};

export function TransferMarketCoachCard({
  teamId,
  homeTeamLabel,
  focusPlayer,
  homeRoster,
  loading = false,
  className,
}: Props) {
  const [view, setView] = useState<TransferMarketView | null>(null);
  const [running, setRunning] = useState(false);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Transfer Market 준비 중…
      </div>
    );
  }

  if (!focusPlayer) return null;

  async function handleRun() {
    if (!focusPlayer) return;
    setRunning(true);
    try {
      const next = buildTransferMarketView({
        teamId,
        focusPlayer,
        homeTeamLabel,
        homeRoster,
        pilotDeterministic: false,
      });
      setView(next);
      try {
        await appendTransferMarketLog(teamId, next.logPayload);
      } catch (e) {
        console.warn("[TransferMarketCoachCard] log append failed", e);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-indigo-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="j4-transfer-market-panel"
      aria-label="Transfer Market"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-violet-950">
        <TrendingUp className="h-4 w-4 text-violet-600" aria-hidden />
        Transfer Market
      </h3>

      {view ? (
        <>
          <p className="mt-2 text-xs font-bold text-violet-950">{view.focusPlayerName}</p>
          <p
            className="text-sm font-black tabular-nums text-violet-900"
            data-testid="j4-transfer-market-value"
          >
            MV {view.marketValueLabel}
          </p>
          <p
            className="text-xs font-bold text-violet-800"
            data-testid="j4-transfer-market-grade"
          >
            {view.grade} · {view.gradeLabelKo}
          </p>
          <ul className="mt-2 space-y-1" data-testid="j4-transfer-market-recommendations">
            {view.recommendations.map((row, index) => (
              <li
                key={row.playerId}
                className="flex items-center gap-2 rounded-md border border-violet-100 bg-white/95 px-2 py-1.5 text-xs"
              >
                <span className="font-black text-violet-800">{index + 1}</span>
                <span className="flex-1 truncate font-semibold text-violet-950">
                  {row.playerName}
                </span>
                <span className="font-bold tabular-nums text-violet-900">
                  {row.marketValue.toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] font-semibold text-violet-800">
            {view.transferProposalLabel}
          </p>
        </>
      ) : null}

      <button
        type="button"
        className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60"
        onClick={() => void handleRun()}
        disabled={running}
        data-testid="j4-transfer-market-run-button"
      >
        {running ? "실행 중…" : "시장 평가 실행"}
      </button>
    </section>
  );
}
