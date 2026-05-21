import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TeamPlayHudSnapshot } from "./teamPlayHudTypes";

const OVR_COUNTUP_AFTER_XP_MS = 520;

type LevelUpBurst = { fromLevel: number; toLevel: number; token: number };

type Props = {
  data: TeamPlayHudSnapshot;
  /** 경기 반영 등: XP 바 먼저 → OVR 나중에 */
  staggerHudReveal?: boolean;
  /** XP 바 아래 짧게 보이는 획득 잔상 (HUD 훅에서 전달) */
  xpEcho?: { amount: number } | null;
  /** 짧은 레벨업 플래시 (토큰으로 연속 트리거 구분) */
  levelUpBurst?: LevelUpBurst | null;
};

const XP_ECHO_FADE_MS = 520;

const LEVEL_UP_TEXT_PUNCH_DELAY_S = 0.16;
const LEVEL_UP_TEXT_PUNCH_DURATION_S = 0.28;

export function PlayerOVRCard({ data, staggerHudReveal = false, xpEcho = null, levelUpBurst = null }: Props) {
  const reduceMotion = useReducedMotion();
  const pct = Math.min(100, Math.round((data.xpCurrent / Math.max(1, data.xpToNext)) * 100));
  const up = data.ovrDelta > 0;
  const startOvr = Math.max(0, data.ovr - Math.max(0, data.ovrDelta));

  const [ovrDisplay, setOvrDisplay] = useState(() => Math.max(0, data.ovr - Math.max(0, data.ovrDelta)));
  const [ovrBounceKey, setOvrBounceKey] = useState(0);
  const [ovrRiseGlow, setOvrRiseGlow] = useState(false);
  const [xpEchoDisplay, setXpEchoDisplay] = useState<{ amount: number } | null>(null);
  const [xpEchoFading, setXpEchoFading] = useState(false);
  const animRef = useRef<{ stop: () => void } | null>(null);
  const riseGlowDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const riseGlowOffRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpEchoExitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevXpEchoActiveRef = useRef(false);

  useEffect(() => {
    const amt = typeof xpEcho?.amount === "number" && xpEcho.amount > 0 ? xpEcho.amount : null;
    if (amt != null) {
      if (xpEchoExitRef.current) {
        clearTimeout(xpEchoExitRef.current);
        xpEchoExitRef.current = null;
      }
      setXpEchoFading(false);
      setXpEchoDisplay({ amount: amt });
      prevXpEchoActiveRef.current = true;
      return;
    }
    if (!prevXpEchoActiveRef.current) return;
    prevXpEchoActiveRef.current = false;
    setXpEchoFading(true);
    xpEchoExitRef.current = window.setTimeout(() => {
      setXpEchoDisplay(null);
      setXpEchoFading(false);
      xpEchoExitRef.current = null;
    }, XP_ECHO_FADE_MS);
    return () => {
      if (xpEchoExitRef.current) {
        clearTimeout(xpEchoExitRef.current);
        xpEchoExitRef.current = null;
      }
    };
  }, [xpEcho]);

  useEffect(() => {
    animRef.current?.stop();
    setOvrBounceKey(0);
    setOvrDisplay(startOvr);
    setOvrRiseGlow(false);
    if (riseGlowDelayRef.current) {
      clearTimeout(riseGlowDelayRef.current);
      riseGlowDelayRef.current = null;
    }
    if (riseGlowOffRef.current) {
      clearTimeout(riseGlowOffRef.current);
      riseGlowOffRef.current = null;
    }

    const runCountup = () => {
      const ctrl = animate(startOvr, data.ovr, {
        duration: 0.9,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => setOvrDisplay(Math.round(v)),
        onComplete: () => {
          setOvrBounceKey((k) => k + 1);
          if (staggerHudReveal && data.ovrDelta > 0) {
            if (riseGlowDelayRef.current) clearTimeout(riseGlowDelayRef.current);
            if (riseGlowOffRef.current) clearTimeout(riseGlowOffRef.current);
            riseGlowDelayRef.current = window.setTimeout(() => {
              setOvrRiseGlow(true);
              riseGlowOffRef.current = window.setTimeout(() => {
                setOvrRiseGlow(false);
                riseGlowOffRef.current = null;
              }, 240);
              riseGlowDelayRef.current = null;
            }, 120);
          }
        },
      });
      animRef.current = ctrl;
      return ctrl;
    };

    if (staggerHudReveal) {
      const t = setTimeout(() => {
        runCountup();
      }, OVR_COUNTUP_AFTER_XP_MS);
      return () => {
        clearTimeout(t);
        animRef.current?.stop();
        if (riseGlowDelayRef.current) clearTimeout(riseGlowDelayRef.current);
        if (riseGlowOffRef.current) clearTimeout(riseGlowOffRef.current);
      };
    }

    const ctrl = runCountup();
    return () => {
      ctrl.stop();
      if (riseGlowDelayRef.current) clearTimeout(riseGlowDelayRef.current);
      if (riseGlowOffRef.current) clearTimeout(riseGlowOffRef.current);
    };
  }, [data.ovr, data.ovrDelta, startOvr, staggerHudReveal]);

  const xpMid = Math.max(0, Math.round(pct * 0.82));
  const xpDelay = staggerHudReveal ? 0.06 : 0.08;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-indigo-950 via-[#0c1224] to-violet-950 p-4 text-white shadow-xl shadow-black/50 transition-shadow duration-200",
        "ring-1 ring-cyan-400/20",
        ovrRiseGlow &&
          "shadow-[0_0_36px_rgba(34,211,238,0.55)] ring-2 ring-cyan-300/80 ring-offset-2 ring-offset-slate-950/80",
        levelUpBurst &&
          "shadow-[0_0_40px_rgba(251,191,36,0.45)] ring-2 ring-amber-400/75 ring-offset-2 ring-offset-slate-950/90 motion-reduce:shadow-none motion-reduce:ring-amber-400/40"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(56,189,248,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-indigo-500/25 blur-2xl" />
      <AnimatePresence>
        {levelUpBurst ? (
          <motion.div
            key={levelUpBurst.token}
            className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center pt-2.5"
            initial={{ opacity: 0, scale: 0.88, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{
              opacity: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              y: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
            }}
            aria-live="assertive"
          >
            <motion.div
              className="flex flex-col items-center gap-0.5 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 px-3.5 py-2 shadow-[0_0_32px_rgba(251,191,36,0.65)] motion-reduce:shadow-md"
              initial={{ scale: 1 }}
              animate={
                reduceMotion ? { scale: 1 } : { scale: [1, 1.08, 1] }
              }
              transition={{
                duration: LEVEL_UP_TEXT_PUNCH_DURATION_S,
                delay: reduceMotion ? 0 : LEVEL_UP_TEXT_PUNCH_DELAY_S,
                ease: [0.22, 1, 0.36, 1],
                times: reduceMotion ? undefined : [0, 0.5, 1],
              }}
            >
              <span className="text-[11px] font-black uppercase tracking-[0.35em] text-amber-950/95">Level up</span>
              <span className="text-sm font-black tabular-nums text-amber-950">
                Lv.{levelUpBurst.fromLevel} → Lv.{levelUpBurst.toLevel}
              </span>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">OVR</p>
      <div className="relative mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
        <motion.span
          key={ovrBounceKey}
          className="inline-block text-5xl font-black tabular-nums leading-none tracking-tighter drop-shadow-[0_0_24px_rgba(34,211,238,0.35)] sm:text-6xl"
          initial={{ scale: 1 }}
          animate={ovrBounceKey > 0 ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {ovrDisplay}
        </motion.span>
        <div className="mb-1 flex flex-col items-start gap-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
              up ? "bg-emerald-500/90 text-emerald-950" : "bg-white/15 text-white/90"
            )}
          >
            {up ? `▲ +${data.ovrDelta}` : data.ovrDelta === 0 ? "—" : `▼ ${data.ovrDelta}`}
            {up ? <span className="ml-1 text-[10px] font-semibold opacity-90">상승 중</span> : null}
          </span>
          {data.ovrMomentumLabel ? (
            <span className="max-w-[11rem] text-[11px] font-semibold leading-snug text-cyan-100/90">
              {data.ovrMomentumLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="relative mt-4 flex items-baseline justify-between gap-2 text-xs text-indigo-100/85">
        <span className="font-semibold">Lv.{data.level}</span>
        <span className="tabular-nums">
          XP {data.xpCurrent} / {data.xpToNext}
        </span>
      </div>
      <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
        <motion.div
          key={`xp-${data.xpCurrent}-${data.xpToNext}-${pct}-${staggerHudReveal}`}
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-500 shadow-[0_0_12px_rgba(167,139,250,0.5)]"
          initial={{ width: "0%" }}
          animate={
            pct <= 0
              ? { width: "0%" }
              : {
                  width: ["0%", `${xpMid}%`, `${pct}%`],
                }
          }
          transition={{
            duration: 1.38,
            times: [0, 0.36, 1],
            delay: xpDelay,
            ease: "easeInOut",
          }}
        />
      </div>
      <p className="relative mt-1.5 text-[11px] font-medium text-cyan-100/75">
        다음 레벨까지 <span className="font-bold tabular-nums">{100 - pct}%</span> 남음
      </p>
      {xpEchoDisplay ? (
        <p
          className={cn(
            "relative mt-2 text-center text-[13px] font-black tabular-nums text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.45)] transition-[opacity,transform] ease-out motion-reduce:transition-none",
            xpEchoFading ? "translate-y-[-3px] scale-[0.98] opacity-0 duration-[520ms]" : "translate-y-0 scale-100 opacity-100 duration-300 animate-in fade-in zoom-in-95"
          )}
          style={{ transitionTimingFunction: xpEchoFading ? "cubic-bezier(0.22, 1, 0.36, 1)" : undefined }}
          aria-live="polite"
        >
          +{xpEchoDisplay.amount} XP · 반영됨
        </p>
      ) : null}
    </div>
  );
}
