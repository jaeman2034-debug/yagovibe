import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { TeamPlayXpFloatPayload } from "./teamPlayHudTypes";

type Props = {
  payload: TeamPlayXpFloatPayload | null;
};

/**
 * 경기 반영 직후: "+N XP"가 HUD 위로 떠올라 보상 인지 → 이후 XP 바·OVR 순차 연출과 맞춤
 */
export function TeamPlayXpGainFloat({ payload }: Props) {
  const reduceMotion = useReducedMotion();
  const dur = reduceMotion ? 0.18 : 0.55;
  const opacityDur = reduceMotion ? 0.12 : 0.4;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-1 sm:pt-2"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {payload ? (
          <motion.div
            key={payload.token}
            initial={{ y: 10, opacity: 0, scale: 0.92 }}
            animate={{ y: -6, opacity: 1, scale: 1 }}
            exit={{ y: -36, opacity: 0, scale: 1.04 }}
            transition={{
              duration: dur,
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: opacityDur },
            }}
            className="rounded-full border border-cyan-400/35 bg-slate-950/85 px-4 py-2 text-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-300/25 backdrop-blur-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">XP 획득</p>
            <p className="mt-0.5 text-xl font-black tabular-nums tracking-tight text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.45)] sm:text-2xl">
              +{payload.amount} XP
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
