import { Link } from "react-router-dom";
import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { instantPlayPath, matchmakingPath } from "@/lib/play/playEcosystemRoutes";

type Props = {
  className?: string;
  /** compact: 홈 카드 하단 한 줄 */
  variant?: "hero" | "compact";
};

/**
 * 홈·라운지용 — 1v1 실시간 매치 즉시 입장 CTA
 */
export function InstantPlayCta({ className, variant = "hero" }: Props) {
  if (variant === "compact") {
    return (
      <Link
        to={instantPlayPath()}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-cyan-950/30 transition hover:brightness-110 active:scale-[0.99]",
          className,
        )}
      >
        <Swords className="h-4 w-4 shrink-0" aria-hidden />
        ⚽ 즉시 플레이
      </Link>
    );
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-950/60 via-indigo-950/50 to-[#070b14] p-4 shadow-lg shadow-black/30",
        className,
      )}
      aria-label="즉시 플레이"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">1v1 Live</p>
      <p className="mt-1 text-sm font-bold text-white">실시간 1대1 경기</p>
      <p className="mt-0.5 text-xs text-slate-400">매칭 후 바로 경기장으로 이동합니다</p>
      <Link
        to={instantPlayPath()}
        className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-fuchsia-600 to-indigo-600 text-base font-black text-white shadow-lg shadow-fuchsia-900/35 transition hover:brightness-110 active:scale-[0.99]"
      >
        <Swords className="h-5 w-5 shrink-0" aria-hidden />
        ⚽ 즉시 플레이
      </Link>
      <Link
        to={matchmakingPath()}
        className="mt-2 block text-center text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-cyan-400 hover:underline"
      >
        모드 선택 · 큐 상세
      </Link>
    </section>
  );
}
