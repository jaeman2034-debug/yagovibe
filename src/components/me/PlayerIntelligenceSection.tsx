import { useAuth } from "@/context/AuthProvider";
import { AICoachV2Card } from "@/components/me/AICoachV2Card";
import { SeasonRankCard } from "@/components/me/SeasonRankCard";
import { YagoProUpgradeCard } from "@/components/me/YagoProUpgradeCard";
import { PlayerArchetypeCard } from "@/components/play/PlayerArchetypeCard";
import { PlayerTrendCard } from "@/components/play/PlayerTrendCard";
import { useAdaptiveCoachPlan } from "@/hooks/useAdaptiveCoachPlan";
import { useEntitlements } from "@/hooks/useEntitlements";
import { usePlayerTrendIntelligence } from "@/hooks/usePlayerTrendIntelligence";

/** /me — intelligence + TRACK 7B PRO gates + TRACK 8A growth */
export function PlayerIntelligenceSection() {
  const { user } = useAuth();
  const uid = user?.uid;
  const entitlements = useEntitlements(uid, Boolean(uid));
  const trendWindow = entitlements.data?.maxTrendWindow ?? 3;

  const { loading, data, error } = usePlayerTrendIntelligence(uid, Boolean(uid), trendWindow);
  const coach = useAdaptiveCoachPlan(uid, Boolean(uid), trendWindow);

  if (!uid) return null;

  return (
    <section
      className="rounded-xl border border-gray-200 bg-[#070b14] p-3 space-y-3 shadow-sm"
      aria-label="축구 인텔리전스"
    >
      <h2 className="text-base font-semibold text-white px-0.5">축구 인텔리전스</h2>
      <YagoProUpgradeCard entitlements={entitlements.data} uid={uid} />
      <SeasonRankCard uid={uid} isPro={entitlements.data?.isPro ?? false} />
      <AICoachV2Card
        plan={coach.data?.plan ?? null}
        coachHistory={coach.data?.coachHistory ?? null}
        isPro={coach.data?.isPro ?? entitlements.data?.isPro ?? false}
        loading={coach.loading}
        error={coach.error}
        uid={uid}
      />
      <PlayerTrendCard trends={data?.trends ?? null} loading={loading} error={error} />
      {!entitlements.data?.isPro ? (
        <p className="text-[10px] text-center text-slate-500 px-1">
          Free: 최근 3경기 · PRO: 최근 10경기 심층 트렌드
        </p>
      ) : null}
      <PlayerArchetypeCard archetypes={data?.archetypes ?? null} loading={loading} error={error} />
    </section>
  );
}
