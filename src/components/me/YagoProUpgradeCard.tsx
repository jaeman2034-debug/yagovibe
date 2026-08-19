import { useEffect, useRef, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackYagoPro } from "@/lib/analytics/yagoProFunnel";
import { callCreateYagoProCheckout } from "@/lib/billing/entitlementsClient";
import type { EntitlementsClient } from "@/lib/billing/entitlementsTypes";
import { useGrowthConfig } from "@/hooks/useGrowthConfig";

type Props = {
  entitlements: EntitlementsClient | null;
  uid?: string | null;
  className?: string;
};

export function YagoProUpgradeCard({ entitlements, uid, className = "" }: Props) {
  const [loading, setLoading] = useState<"month" | "year" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewedRef = useRef(false);
  const { config } = useGrowthConfig(uid);
  const defaultPlan = config.paywall_default_plan;
  const showAnnual = config.paywall_show_annual;
  const emphasizeAnnual = config.paywall_annual_emphasis;

  useEffect(() => {
    if (entitlements?.isPro || viewedRef.current) return;
    viewedRef.current = true;
    trackYagoPro.paywallView({
      surface: "me_upgrade_card",
      trigger: "organic",
      is_pro: false,
      uid,
      variant: defaultPlan === "year" ? "annual_primary" : "monthly_primary",
    });
  }, [entitlements?.isPro, uid, defaultPlan]);

  if (entitlements?.isPro) {
    return (
      <div
        className={`rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-[#070b14]/80 px-3 py-3 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-300" aria-hidden />
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-300/90">YAGO PRO</p>
        </div>
        <p className="mt-1 text-sm font-bold text-white">활성 구독 중</p>
        {entitlements.subscriptionRenewalAt ? (
          <p className="mt-0.5 text-xs text-slate-400">
            갱신 예정: {new Date(entitlements.subscriptionRenewalAt).toLocaleDateString("ko-KR")}
          </p>
        ) : null}
      </div>
    );
  }

  const startCheckout = async (interval: "month" | "year") => {
    setError(null);
    setLoading(interval);
    trackYagoPro.checkoutStarted({
      surface: "me_upgrade_card",
      trigger: "organic",
      interval,
      uid,
      variant: defaultPlan === "year" ? "annual_primary" : "monthly_primary",
    });
    try {
      const url = await callCreateYagoProCheckout(interval);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제를 시작할 수 없습니다.");
      setLoading(null);
    }
  };

  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-indigo-950/20 to-[#070b14]/80 px-3 py-3 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-300" aria-hidden />
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-300/90">Upgrade to YAGO PRO</p>
      </div>
      <p className="mt-1 text-xs text-slate-300">
        최근 3경기 → <span className="font-semibold text-amber-200">PRO 10경기</span> 심층 트렌드 · 코치 히스토리
      </p>
      {config.discount_offer_enabled && config.discount_offer_percent > 0 ? (
        <p className="mt-1 text-[11px] font-semibold text-emerald-300">
          한정 혜택: {config.discount_offer_percent}% 할인 적용 가능
        </p>
      ) : null}
      <ul className="mt-2 space-y-0.5 text-[11px] text-slate-400">
        <li>• Adaptive coach 히스토리</li>
        <li>• 확장 성장 트렌드 (10경기)</li>
        <li>• PRO 프로필 프레임</li>
      </ul>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {defaultPlan === "year" ? (
          <>
            {showAnnual ? (
              <Button
                type="button"
                className={`flex-1 font-bold ${emphasizeAnnual ? "bg-amber-500 hover:bg-amber-400 text-black" : "bg-amber-600 hover:bg-amber-500"}`}
                disabled={loading != null}
                onClick={() => void startCheckout("year")}
              >
                {loading === "year" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "연 $39.99 (2개월 무료)"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-amber-500/40 text-amber-100"
              disabled={loading != null}
              onClick={() => void startCheckout("month")}
            >
              {loading === "month" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "월 $4.99"}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              className="flex-1 bg-amber-600 font-bold hover:bg-amber-500"
              disabled={loading != null}
              onClick={() => void startCheckout("month")}
            >
              {loading === "month" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "월 $4.99"}
            </Button>
            {showAnnual ? (
              <Button
                type="button"
                variant="outline"
                className={`flex-1 border-amber-500/40 ${emphasizeAnnual ? "text-amber-50 border-amber-300" : "text-amber-100"}`}
                disabled={loading != null}
                onClick={() => void startCheckout("year")}
              >
                {loading === "year" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "연 $39.99 (2개월 무료)"}
              </Button>
            ) : null}
          </>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
