import { PlayerOVRCard } from "./hud/PlayerOVRCard";
import { PlayerProgressCard } from "./hud/PlayerProgressCard";
import { MVPStatusCard } from "./hud/MVPStatusCard";
import { mergeTeamPlayHud, type TeamPlayHudSnapshot } from "./hud/teamPlayHudTypes";

export type { TeamPlayHudSnapshot };

/** 연승·MVP 순위 기준 “한 줄 서사” (HUD ↔ 아래 카드 톤 연결용) */
function playHudNarrativeLine(d: TeamPlayHudSnapshot): string | null {
  if (d.streakWins >= 2) return "🔥 상승세 유지 중";
  if (d.mvpRank === 1) return "👑 MVP 레이스 선두";
  if (d.mvpRank >= 2 && d.mvpRank <= 3) return "🎯 MVP 추격 중";
  return null;
}

export function TeamPlayHUD({
  snapshot,
  staggerHudReveal = false,
  xpEcho = null,
  levelUpBurst = null,
  hideMvp = false,
}: {
  snapshot?: Partial<TeamPlayHudSnapshot> | null;
  /** 경기 반영 루틴: XP → OVR → MVP 순으로 살아나게 */
  staggerHudReveal?: boolean;
  /** XP 바 바로 아래 잔상 (+N XP) */
  xpEcho?: { amount: number } | null;
  /** OVR 카드 짧은 레벨업 플래시 */
  levelUpBurst?: { fromLevel: number; toLevel: number; token: number } | null;
  /** 라운지 above-fold: MVP는 below-fold로 */
  hideMvp?: boolean;
}) {
  const data = mergeTeamPlayHud(snapshot);
  const narrative = playHudNarrativeLine(data);

  return (
    <section aria-label="플레이어 상태" className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 p-1 shadow-2xl shadow-slate-900/50 ring-1 ring-white/5 dark:ring-white/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, white 0px, white 1px, transparent 1px, transparent 28px), repeating-linear-gradient(0deg, white 0px, white 1px, transparent 1px, transparent 28px)",
          }}
        />
        <div className="relative rounded-[1.35rem] bg-slate-950/40 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-200/90">내 상태</h2>
            <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold tabular-nums text-indigo-100/80">
              LIVE
            </span>
          </div>
          {narrative ? (
            <p
              className="mb-3 rounded-xl border border-cyan-400/15 bg-gradient-to-r from-cyan-500/[0.12] via-indigo-500/[0.1] to-violet-500/[0.12] px-3 py-2 text-center text-[12px] font-bold leading-snug tracking-tight text-cyan-100/95 shadow-inner shadow-black/20 sm:text-left"
              role="status"
            >
              {narrative}
            </p>
          ) : null}
          <div
            className={
              hideMvp ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-3"
            }
          >
            <PlayerOVRCard
              data={data}
              staggerHudReveal={staggerHudReveal}
              xpEcho={xpEcho}
              levelUpBurst={levelUpBurst}
            />
            <PlayerProgressCard data={data} staggerHudReveal={staggerHudReveal} />
            {!hideMvp ? <MVPStatusCard data={data} staggerHudReveal={staggerHudReveal} /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
