import { useState } from "react";
import type { PlayPlayerStatsDoc } from "@/utils/playerStats";
import type { ParticipationHint } from "@/lib/play/avatarDailyStatus";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PlayerCard from "./PlayerCard";

type Props = {
  player: PlayPlayerStatsDoc;
  participationHint?: ParticipationHint;
  superBadgeCount?: number;
  ovrRankLine?: string | null;
};

/** 로비용 컴팩트 카드 — 상세는 모달 */
export function PlayLobbyPlayerSummary({
  player,
  participationHint,
  superBadgeCount = 0,
  ovrRankLine,
}: Props) {
  const [open, setOpen] = useState(false);
  const pos = player.mainPosition ?? "MF";
  const { speed, pass, shoot } = player.stats;

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-white/10 bg-[#0f1420] text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-left text-base font-black text-white">내 선수 카드</DialogTitle>
          </DialogHeader>
          <PlayerCard
            player={player}
            highlight
            hero
            participationHint={participationHint}
            superBadgeCount={superBadgeCount}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
