import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { labelCoachFocusArea, labelCoachTrend } from "@/lib/telemetry/coachClient";
import type { CoachHistoryEntryClient, CoachPlanClient } from "@/lib/telemetry/coachTypes";
import { ProFeatureLock } from "@/components/me/ProFeatureLock";
import { YagoProPaywallStrip } from "@/components/me/YagoProPaywallStrip";
import { trackYagoPro } from "@/lib/analytics/yagoProFunnel";
import { callCreateYagoProCheckout } from "@/lib/billing/entitlementsClient";
import { useGrowthConfig } from "@/hooks/useGrowthConfig";
import { registerContextualTriggerCandidate } from "@/hooks/usePaywallTrigger";

type Props = {
  plan: CoachPlanClient | null;
  coachHistory?: CoachHistoryEntryClient[] | null;
  isPro?: boolean;
  loading: boolean;
  error: string | null;
  className?: string;
  uid?: string | null;
};

const STREAK_MILESTONES = new Set([3, 5, 10]);

function trendColor(trend: CoachPlanClient["focusTrend"]): string {
  if (trend === "improving") return "text-emerald-300";
  if (trend === "declining") return "text-rose-300";
  return "text-amber-200";
}

function buildCoachTeaseRows(plan: CoachPlanClient): CoachHistoryEntryClient[] {
  const now = Date.now();
  return [
    {
      focusArea: plan.focusArea,
      target: "Match vs Rivals FC",
      diagnosis: plan.diagnosis || "Your passing angle dropped after 68' — tighten mid-block spacing on transitions.",
      recordedAtMs: now - 86_400_000,
    },
    {
      focusArea: "Passing",
      target: "Match vs Eagles",
      diagnosis: "Defensive spacing issue in the final third — widen support triangles on build-up.",
      recordedAtMs: now - 172_800_000,
    },
  ];
}

export function AICoachV2Card({
  plan,
  coachHistory,
  isPro = false,
  loading,
  error,
  className = "",
  uid,
}: Props) {
  const { config } = useGrowthConfig(uid);
  const checkoutPlan = config.paywall_default_plan;
  useEffect(() => {
    if (isPro) return;
    registerContextualTriggerCandidate("coach_tease");
  }, [isPro]);

  const handleUnlockPro = () => {
    trackYagoPro.coachTeaseCtaClicked({
      surface: "coach_tease",
      trigger: "coach_insight",
      uid,
      variant: "coach_tease",
    });
    trackYagoPro.checkoutStarted({
      surface: "coach_tease",
      trigger: "coach_insight",
      interval: checkoutPlan,
      uid,
      variant: "coach_tease",
    });
    void callCreateYagoProCheckout(checkoutPlan).then((url) => {
      window.location.href = url;
    });
  };

  if (loading) {
    return (
      <div className={`rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3 py-4 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-cyan-200/90">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          AI 코치 플랜 불러오는 중…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl border border-rose-500/25 bg-rose-950/15 px-3 py-3 ${className}`}>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-rose-300/90">AI Coach V2</p>
        <p className="mt-2 text-xs text-rose-200/80">{error}</p>
      </div>
    );
  }

  if (!plan) return null;

  const hasHistory = Boolean(coachHistory && coachHistory.length > 0);
  const latestPreview = !isPro && hasHistory ? coachHistory![0]! : null;
  const lockedTeaseRows =
    !isPro && hasHistory
      ? buildCoachTeaseRows(plan).slice(0, 2)
      : !isPro
        ? buildCoachTeaseRows(plan)
        : coachHistory ?? [];
  const showStreakStrip = !isPro && STREAK_MILESTONES.has(plan.streak);

  return (
    <div
      className={`rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-[#070b14]/80 px-3 py-3 ${className}`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-300/90">AI Coach V2</p>
      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{plan.diagnosis}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-cyan-400/15 bg-cyan-500/5 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/70">Focus</p>
          <p className="mt-0.5 text-sm font-bold text-white">{labelCoachFocusArea(plan.focusArea)}</p>
        </div>
        <div className="rounded-lg border border-cyan-400/15 bg-cyan-500/5 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/70">Trend</p>
          <p className={`mt-0.5 text-sm font-bold ${trendColor(plan.focusTrend)}`}>
            {labelCoachTrend(plan.focusTrend)}
          </p>
        </div>
        <div className="rounded-lg border border-cyan-400/15 bg-cyan-500/5 px-2.5 py-2 col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/70">Goal</p>
          <p className="mt-0.5 text-sm font-bold text-white">{plan.target}</p>
        </div>
        <div className="rounded-lg border border-cyan-400/15 bg-cyan-500/5 px-2.5 py-2 col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/70">Training Streak</p>
          <p className="mt-0.5 font-mono text-lg font-black tabular-nums text-cyan-100">{plan.streak}</p>
        </div>
      </div>

      {plan.drills.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-slate-300">
          {plan.drills.slice(0, 2).map((drill) => (
            <li key={drill} className="flex gap-1.5">
              <span className="text-cyan-400/80">•</span>
              <span>{drill}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {latestPreview ? (
        <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/80">Latest insight</p>
          <p className="mt-1 font-semibold text-cyan-100 text-xs">
            {labelCoachFocusArea(latestPreview.focusArea)} · {latestPreview.target}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-300 line-clamp-2">{latestPreview.diagnosis}</p>
        </div>
      ) : null}

      {!isPro ? (
        <ProFeatureLock
          locked
          title={config.coach_tease_headline}
          description={config.coach_tease_subcopy}
          ctaLabel={config.coach_tease_cta}
          onUnlock={handleUnlockPro}
          uid={uid}
          analyticsSurface="coach_tease"
          analyticsVariant="coach_tease"
          analyticsTrigger="coach_insight"
          className="mt-3"
        >
          {lockedTeaseRows.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-300">
              {lockedTeaseRows.map((h, i) => (
                <li
                  key={`${h.recordedAtMs}-${h.target}-${i}`}
                  className="rounded-lg border border-cyan-400/10 bg-cyan-500/5 px-2 py-1.5"
                >
                  <p className="font-semibold text-cyan-100">🔒 {h.target}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{h.diagnosis}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 px-1 py-2">경기가 쌓이면 코칭 히스토리가 표시됩니다.</p>
          )}
        </ProFeatureLock>
      ) : hasHistory ? (
        <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
          {coachHistory!.slice(0, 5).map((h) => (
            <li
              key={`${h.recordedAtMs}-${h.target}`}
              className="rounded-lg border border-cyan-400/10 bg-cyan-500/5 px-2 py-1.5"
            >
              <p className="font-semibold text-cyan-100">
                {labelCoachFocusArea(h.focusArea)} · {h.target}
              </p>
              <p className="text-[10px] text-slate-400 line-clamp-1">{h.diagnosis}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {showStreakStrip ? (
        <YagoProPaywallStrip
          surface="streak"
          trigger="streak"
          isPro={isPro}
          uid={uid}
          className="mt-3"
          headline={config.streak_headline.replace("{streak}", String(plan.streak))}
          subline={config.streak_subcopy}
        />
      ) : null}
    </div>
  );
}
