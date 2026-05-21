import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import type { TeamPlayHudSnapshot } from "./teamPlayHudTypes";

/** OVR 카운트업(~0.9s) 시작 지연(0.52s) 이후에 맞춰 ‘결과’ 느낌 */
const MVP_SPRING_DELAY_STAGGER_S = 1.58;

type Props = {
  data: TeamPlayHudSnapshot;
  staggerHudReveal?: boolean;
};

export function MVPStatusCard({ data, staggerHudReveal = false }: Props) {
  const showChaser =
    data.mvpChaserRank > 0 &&
    data.mvpChaserGapPoints > 0 &&
    data.mvpRank > 0 &&
    data.mvpChaserRank > data.mvpRank;

  const springDelay = staggerHudReveal ? MVP_SPRING_DELAY_STAGGER_S : 0;

  return (
    <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-md dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/30">
      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
        <Trophy className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-wider">MVP 레이스</p>
      </div>
      <motion.p
        key={`${data.mvpRank}-${data.mvpLeadPoints}`}
        className="mt-2 text-2xl font-black tabular-nums text-amber-950 dark:text-amber-50"
        initial={{ scale: 0.88, y: 6, opacity: 0.75 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 460,
          damping: 22,
          delay: springDelay,
        }}
      >
        {data.mvpRank}위
      </motion.p>
      <p className="mt-1 text-xs font-semibold text-amber-900/90 dark:text-amber-100/90">
        {data.mvpTrendLabel}: <span className="tabular-nums">{data.mvpLeadPoints}점</span>
      </p>
      {data.mvpTurnaroundLine ? (
        <p className="mt-2 text-[11px] font-bold leading-snug text-orange-800 dark:text-orange-200/95">
          {data.mvpTurnaroundLine}
        </p>
      ) : null}
      {showChaser ? (
        <p className="mt-2 rounded-lg border border-rose-200/80 bg-rose-50/90 px-2.5 py-1.5 text-[11px] font-bold leading-snug text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
          ⚠ {data.mvpChaserRank}위까지 {data.mvpChaserGapPoints}점 차 — 추격 당하는 중
        </p>
      ) : null}
      <p className="mt-2 text-[11px] font-medium text-amber-900/75 dark:text-amber-200/80">
        경기 피드백·출전 기록이 순위에 반영돼요.
      </p>
    </div>
  );
}
