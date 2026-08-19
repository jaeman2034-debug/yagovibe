import { useEffect, useState } from "react";
import { Crown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackYagoPro, type YagoProPaywallSurface, type YagoProPaywallTrigger, type YagoProPaywallVariant } from "@/lib/analytics/yagoProFunnel";
import { callCreateYagoProCheckout } from "@/lib/billing/entitlementsClient";
import { useGrowthConfig } from "@/hooks/useGrowthConfig";
import { canShowContextualPaywall, markContextualPaywallShown, registerContextualTriggerCandidate } from "@/hooks/usePaywallTrigger";

type Props = {
  surface: YagoProPaywallSurface;
  trigger: YagoProPaywallTrigger;
  isPro?: boolean;
  uid?: string | null;
  headline?: string;
  subline?: string;
  className?: string;
  variant?: YagoProPaywallVariant;
};

export function YagoProPaywallStrip({
  surface,
  trigger,
  isPro = false,
  uid,
  headline = "10경기 심층 트렌드 + 코치 히스토리",
  subline = "방금 경기 인사이트를 PRO에서 더 깊게 분석하세요.",
  className = "",
  variant = "monthly_primary",
}: Props) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const { config } = useGrowthConfig();
  const checkoutPlan = config.paywall_default_plan;
  const ctaLabel = checkoutPlan === "year" ? "PRO 연 $39.99" : "PRO $4.99/월";

  useEffect(() => {
    if (isPro) {
      setVisible(false);
      return;
    }
    registerContextualTriggerCandidate(trigger);
    if (!canShowContextualPaywall(trigger, uid)) {
      setVisible(false);
      return;
    }
    markContextualPaywallShown(trigger);
    setVisible(true);
    trackYagoPro.paywallView({ surface, trigger, is_pro: false, uid, variant });
  }, [isPro, surface, trigger, uid, variant]);

  if (isPro || !visible) return null;

  const dismiss = () => {
    trackYagoPro.paywallDismissed({ surface, trigger, is_pro: false, uid, variant });
    setVisible(false);
  };

  const startCheckout = async () => {
    setLoading(true);
    trackYagoPro.checkoutStarted({
      surface,
      trigger,
      interval: checkoutPlan,
      uid,
      variant,
    });
    try {
      const url = await callCreateYagoProCheckout(checkoutPlan);
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-950/40 to-indigo-950/25 px-3 py-2.5 ${className}`}
    >
      <button
        type="button"
        className="absolute right-2 top-2 rounded p-0.5 text-slate-400 hover:text-white"
        aria-label="닫기"
        onClick={dismiss}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
      <div className="flex flex-col gap-2 pr-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 min-w-0">
          <Crown className="h-4 w-4 shrink-0 text-amber-300 mt-0.5" aria-hidden />
          <div>
            <p className="text-xs font-bold text-white">{headline}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{subline}</p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 bg-amber-600 font-bold hover:bg-amber-500"
          disabled={loading}
          onClick={() => void startCheckout()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : ctaLabel}
        </Button>
      </div>
    </div>
  );
}
