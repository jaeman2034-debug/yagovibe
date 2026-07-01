/**
 * J4-4 — Parent Home Transfer Market
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
  focusPlayer: RosterEntry;
  homeRoster: RosterEntry[];
  pilotDeterministic?: boolean;
  className?: string;
};

export function TransferMarketPanel({
  teamId,
  homeTeamLabel,
  focusPlayer,
  homeRoster,
  pilotDeterministic = false,
  className,
}: Props) {
  const [view, setView] = useState<TransferMarketView | null>(() =>
    pilotDeterministic && focusPlayer.playerId
      ? buildTransferMarketView({
          teamId,
          focusPlayer,
          homeTeamLabel,
          homeRoster,
          pilotDeterministic: true,
        })
      : null
  );
  const [running, setRunning] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setLogError(null);
    try {
      const next = buildTransferMarketView({
        teamId,
        focusPlayer,
        homeTeamLabel,
        homeRoster,
        pilotDeterministic,
      });
      setView(next);
      try {
        await appendTransferMarketLog(teamId, next.logPayload);
      } catch (e) {
        console.warn("[TransferMarketPanel] log append failed", e);
        setLogError("결과는 표시되었지만 기록 저장에 실패했습니다.");
      }
    } finally {
      setRunning(false);
    }
  }

  const contextLabels = [
    view?.teamRankLabel,
    view?.leagueRankLabel,
  ].filter(Boolean);

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/50 px-3 py-3",
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
          <p className="mt-2 text-sm font-bold text-violet-950">{view.focusPlayerName}</p>
          <p
            className="mt-1 text-lg font-black tabular-nums text-violet-900"
            data-testid="j4-transfer-market-value"
          >
            시장 가치 {view.marketValueLabel}
          </p>
          <p
            className="mt-1 text-sm font-bold text-violet-800"
            data-testid="j4-transfer-market-grade"
          >
            {view.grade}등급 · {view.gradeLabelKo}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-violet-700">{view.prospectLabel}</p>

          {contextLabels.length > 0 ? (
            <p className="mt-2 text-[11px] font-semibold text-violet-700">
              {contextLabels.join(" · ")}
            </p>
          ) : null}

          <p className="mt-2 text-xs font-bold text-violet-950">
            이적 제안
            <span className="mt-0.5 block font-semibold text-violet-800">
              {view.transferProposalLabel}
            </span>
          </p>

          <ul className="mt-3 space-y-1" data-testid="j4-transfer-market-recommendations">
            {view.recommendations.map((row, index) => (
              <li
                key={row.playerId}
                className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white/90 px-2.5 py-2 text-xs"
              >
                <span className="w-5 font-black tabular-nums text-violet-800">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-violet-950">
                  {row.playerName}
                </span>
                <span className="font-black tabular-nums text-violet-900">
                  {row.marketValue.toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-xs text-violet-800">시장 평가를 실행하면 가치·추천이 표시됩니다.</p>
      )}

      <button
        type="button"
        className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
        onClick={() => void handleRun()}
        disabled={running}
        data-testid="j4-transfer-market-run-button"
      >
        {running ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            실행 중…
          </span>
        ) : (
          "시장 평가 실행"
        )}
      </button>

      {logError ? <p className="mt-2 text-[10px] text-amber-800">{logError}</p> : null}
    </section>
  );
}
