export type SubscriptionTierClient = "free" | "pro";

export type SubscriptionStatusClient =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled";

export type YagoProEntitlementClient =
  | "advanced_coach_history"
  | "extended_trends"
  | "pro_badge"
  | "pro_profile_frame";

export type EntitlementsClient = {
  uid: string;
  tier: SubscriptionTierClient;
  status: SubscriptionStatusClient;
  isPro: boolean;
  entitlements: YagoProEntitlementClient[];
  subscriptionRenewalAt: number | null;
  maxTrendWindow: number;
};
