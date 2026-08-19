/**
 * TRACK 8B — canonical revenue lifecycle taxonomy (client mirror).
 * Keep in sync with `functions/src/analytics/revenueLifecycleTaxonomy.ts`.
 */

export const ACQUISITION_EVENTS = {
  PAYWALL_VIEW: "paywall_view",
  PAYWALL_DISMISSED: "paywall_dismissed",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  PURCHASE_SUCCESS: "purchase_success",
  COACH_TEASE_CTA_CLICKED: "coach_tease_cta_clicked",
} as const;

export const RETENTION_EVENTS = {
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_RENEWED: "subscription_renewed",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  SUBSCRIPTION_EXPIRED: "subscription_expired",
  PAYMENT_FAILED: "payment_failed",
  PAYMENT_RECOVERED: "payment_recovered",
  INVOICE_PAID: "invoice_paid",
} as const;

export type AcquisitionEventName = (typeof ACQUISITION_EVENTS)[keyof typeof ACQUISITION_EVENTS];
export type RetentionEventName = (typeof RETENTION_EVENTS)[keyof typeof RETENTION_EVENTS];

export const REVENUE_EVENT_SOURCE = {
  STRIPE_WEBHOOK: "stripe_webhook",
  CLIENT: "client",
} as const;

/** Legacy client aliases → canonical acquisition events */
export const CLIENT_EVENT_ALIASES = {
  checkout_success: ACQUISITION_EVENTS.CHECKOUT_COMPLETED,
  upgrade_success: ACQUISITION_EVENTS.PURCHASE_SUCCESS,
  downgrade_completed: "downgrade_completed",
} as const;
