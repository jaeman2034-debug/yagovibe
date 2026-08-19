import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackYagoPro, type YagoProPaywallSurface, type YagoProPaywallTrigger, type YagoProPaywallVariant } from "@/lib/analytics/yagoProFunnel";

type Props = {
  locked: boolean;
  title: string;
  description?: string;
  ctaLabel?: string;
  onUnlock?: () => void;
  children: ReactNode;
  className?: string;
  analyticsSurface?: YagoProPaywallSurface;
  analyticsVariant?: YagoProPaywallVariant;
  analyticsTrigger?: YagoProPaywallTrigger;
  uid?: string | null;
};

export function ProFeatureLock({
  locked,
  title,
  description,
  ctaLabel = "Unlock Pro",
  onUnlock,
  children,
  className = "",
  analyticsSurface = "me_coach_lock",
  analyticsVariant = "monthly_primary",
  analyticsTrigger = "coach_insight",
  uid,
}: Props) {
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!locked || viewedRef.current) return;
    viewedRef.current = true;
    trackYagoPro.paywallView({
      surface: analyticsSurface,
      trigger: analyticsTrigger,
      is_pro: false,
      uid,
      variant: analyticsVariant,
    });
  }, [locked, analyticsSurface, analyticsTrigger, analyticsVariant, uid]);

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      <div className="pointer-events-none select-none blur-[2px] opacity-50">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#070b14]/75 px-4 py-6 text-center">
        <Lock className="h-5 w-5 text-amber-300/90" aria-hidden />
        <p className="text-sm font-bold text-white">{title}</p>
        {description ? <p className="text-xs text-slate-300 max-w-xs">{description}</p> : null}
        {onUnlock ? (
          <Button
            type="button"
            size="sm"
            className="mt-1 bg-amber-600 font-bold hover:bg-amber-500"
            onClick={onUnlock}
          >
            {ctaLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
