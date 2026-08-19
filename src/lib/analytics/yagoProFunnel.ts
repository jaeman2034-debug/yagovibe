/**
 * TRACK 8A — YAGO PRO conversion funnel (Firebase GA4 via track()).
 * TRACK 8B — taxonomy aligned with revenueLifecycleTaxonomy.ts
 * TRACK 8C Sprint 2 — multi-experiment exposure attribution
 */
import { track } from "@/lib/analytics";
import { ACQUISITION_EVENTS } from "@/lib/analytics/revenueLifecycleTaxonomy";
import { toExperimentAnalyticsPayload } from "@/lib/experiments/exposure";

export type YagoProPaywallSurface =
  | "me_upgrade_card"
  | "me_coach_lock"
  | "me_trend_footer"
  | "post_match"
  | "rank_up"
  | "streak_milestone"
  | "streak"
  | "coach_insight"
  | "coach_tease";

export type YagoProPaywallTrigger =
  | "organic"
  | "post_match"
  | "rank_up"
  | "streak"
  | "coach_insight"
  | "pro_success_return";

export type YagoProPaywallVariant =
  | "control"
  | "monthly_primary"
  | "annual_primary"
  | "coach_tease";

export type YagoProFunnelBase = {
  surface: YagoProPaywallSurface;
  trigger?: YagoProPaywallTrigger;
  variant?: YagoProPaywallVariant;
  is_pro?: boolean;
};

function uidHint(uid?: string | null): string | undefined {
  const id = uid?.trim();
  return id ? id.slice(0, 8) : undefined;
}

function withExposure(params: YagoProFunnelBase & { uid?: string | null }) {
  return {
    surface: params.surface,
    trigger: params.trigger ?? "organic",
    variant: params.variant ?? "monthly_primary",
    is_pro: params.is_pro ?? false,
    uid_hint: uidHint(params.uid),
    ...toExperimentAnalyticsPayload(params.surface, params.uid),
  };
}

export const trackYagoPro = {
  paywallView(params: YagoProFunnelBase & { uid?: string | null }) {
    void track(ACQUISITION_EVENTS.PAYWALL_VIEW, withExposure(params));
  },

  paywallDismissed(params: YagoProFunnelBase & { uid?: string | null }) {
    void track(ACQUISITION_EVENTS.PAYWALL_DISMISSED, withExposure(params));
  },

  checkoutStarted(params: YagoProFunnelBase & { interval: "month" | "year"; uid?: string | null }) {
    void track(ACQUISITION_EVENTS.CHECKOUT_STARTED, {
      ...withExposure(params),
      interval: params.interval,
    });
  },

  coachTeaseCtaClicked(params: YagoProFunnelBase & { uid?: string | null }) {
    void track(ACQUISITION_EVENTS.COACH_TEASE_CTA_CLICKED, withExposure({
      ...params,
      surface: "coach_tease",
      trigger: params.trigger ?? "coach_insight",
      variant: params.variant ?? "coach_tease",
    }));
  },

  checkoutSuccess(params: { interval?: "month" | "year" | "unknown"; uid?: string | null; surface?: YagoProPaywallSurface }) {
    const surface = params.surface ?? "me_upgrade_card";
    void track(ACQUISITION_EVENTS.CHECKOUT_COMPLETED, {
      interval: params.interval ?? "unknown",
      trigger: "pro_success_return",
      uid_hint: uidHint(params.uid),
      ...toExperimentAnalyticsPayload(surface, params.uid),
    });
  },

  upgradeSuccess(params: YagoProFunnelBase & { uid?: string | null; tier?: "pro" }) {
    void track(ACQUISITION_EVENTS.PURCHASE_SUCCESS, {
      ...withExposure(params),
      tier: params.tier ?? "pro",
    });
  },

  downgradeCompleted(params: { uid?: string | null; surface?: YagoProPaywallSurface }) {
    void track("downgrade_completed", {
      surface: params.surface ?? "me_upgrade_card",
      uid_hint: uidHint(params.uid),
    });
  },
};
