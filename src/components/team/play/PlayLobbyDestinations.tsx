import { Link } from "react-router-dom";
import { MapPin, Swords, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { instantPlayPath, matchmakingPath, playgroundPath } from "@/lib/play/playEcosystemRoutes";

type Props = {
  className?: string;
};

/**
 * 플레이 라운지 hero CTA — action-first (매치 > 운동장)
 */
export function PlayLobbyDestinations({ className }: Props) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-700/30 via-indigo-900/40 to-[#070b14] p-4 shadow-lg shadow-violet-950/50 ring-1 ring-white/10",
        className
      )}
      aria-label="게임 진입"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/25 blur-2xl"
        aria-hidden
      />
      <p className="relative text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">Play Now</p>
      <div className="relative mt-3 flex flex-col gap-2.5">
        <Link
          to={instantPlayPath()}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-600 to-indigo-600 px-4 py-3.5 text-base font-black text-white shadow-lg shadow-fuchsia-900/40 transition hover:brightness-110 active:scale-[0.99]"
        >
          <Users className="h-5 w-5 shrink-0" aria-hidden />
          ⚽ 즉시 플레이
        </Link>
        <Link
          to={matchmakingPath()}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10 active:scale-[0.99]"
        >
          큐 상세 · 모드 선택
        </Link>
        <Link
          to={playgroundPath()}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15 active:scale-[0.99]"
        >
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          운동장 입장
        </Link>
      </div>
      <p className="relative mt-2.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
        <Swords className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        5v5 · 8v8 실시간 큐
      </p>
    </section>
  );
}
