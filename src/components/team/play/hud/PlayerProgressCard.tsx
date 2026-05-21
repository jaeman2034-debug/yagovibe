import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { TeamPlayHudSnapshot } from "./teamPlayHudTypes";

type Props = {
  data: TeamPlayHudSnapshot;
  staggerHudReveal?: boolean;
};

export function PlayerProgressCard({ data, staggerHudReveal = false }: Props) {
  return (
    <motion.div
      className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-md dark:border-slate-700 dark:bg-slate-900/90"
      initial={false}
      animate={staggerHudReveal ? { opacity: [0.65, 1], y: [6, 0] } : { opacity: 1, y: 0 }}
      transition={
        staggerHudReveal
          ? { duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0 }
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">최근 경기</p>
        {data.streakWins >= 2 ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-300">
            <Flame className="h-3 w-3" aria-hidden />
            {data.streakWins}연승
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{data.recentMatchLine}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          컨디션: <span className="text-emerald-600 dark:text-emerald-400">{data.conditionLabel}</span>
        </span>
        <span className="rounded-md bg-violet-100 px-2 py-0.5 font-bold text-violet-800 dark:bg-violet-950/80 dark:text-violet-200">
          +{data.xpGainRecent} XP
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        {data.streakWins >= 2
          ? `🔥 최근 ${data.streakWins}경기 연속 상승세 (데모)`
          : "최근 폼 유지 중 · 다음 경기에서 XP를 더 모아보세요 (데모)"}
      </p>
    </motion.div>
  );
}
