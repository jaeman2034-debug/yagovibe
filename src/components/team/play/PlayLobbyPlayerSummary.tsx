import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PlayPlayerStatsDoc } from "@/utils/playerStats";
import type { ParticipationHint } from "@/lib/play/avatarDailyStatus";
import { Button } from "@/components/ui/button";
import PlayerCard from "./PlayerCard";

type Props = {
  player: PlayPlayerStatsDoc;
  participationHint?: ParticipationHint;
  superBadgeCount?: number;
  ovrRankLine?: string | null;
};

/** 로비용 컴팩트 카드 — 상세는 body 포털 모달 (아코디언 overflow/backdrop 클리핑 회피) */
export function PlayLobbyPlayerSummary({
  player,
  participationHint,
  superBadgeCount = 0,
  ovrRankLine,
}: Props) {
  const [open, setOpen] = useState(false);
  const pos = player.mainPosition ?? "MF";
  const { speed, pass, shoot } = player.stats;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-indigo-950/50 to-slate-900/80 p-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-inner">
          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-200/90">OVR</span>
          <span className="text-xl font-black tabular-nums leading-none text-white">{player.ovr}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{player.displayName}</p>
          <p className="mt-0.5 text-xs font-semibold text-cyan-300/90">
            {pos} · Lv.{player.level}
          </p>
          <p className="mt-1 text-[10px] font-medium tabular-nums text-slate-400">
            Speed {speed} · Pass {pass} · Shot {shoot}
          </p>
          {ovrRankLine ? (
            <p className="mt-1 truncate text-[10px] font-bold text-indigo-300/80">{ovrRankLine}</p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 shrink-0 border-white/20 bg-white/5 text-xs font-bold text-white hover:bg-white/10"
          onClick={() => setOpen(true)}
        >
          상세
        </Button>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[100001] flex items-end justify-center p-0 sm:items-center sm:p-4"
              role="presentation"
              data-testid="play-lobby-player-detail-overlay"
              onClick={() => setOpen(false)}
            >
              <div className="absolute inset-0 bg-black/70" aria-hidden />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="play-lobby-player-detail-title"
                className="relative z-[1] flex max-h-[min(92dvh,920px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0f1420] shadow-2xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <h2
                    id="play-lobby-player-detail-title"
                    className="text-base font-black text-white"
                  >
                    내 선수 카드
                  </h2>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                    onClick={() => setOpen(false)}
                  >
                    닫기
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                  <PlayerCard
                    player={player}
                    highlight
                    hero
                    participationHint={participationHint}
                    superBadgeCount={superBadgeCount}
                  />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
