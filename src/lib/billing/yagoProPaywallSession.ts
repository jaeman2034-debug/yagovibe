/** Re-export — use `usePaywallTrigger` / `canShowContextualPaywall` as canonical API. */
export {
  canShowContextualPaywall,
  markContextualPaywallShown,
  hasShownContextualPaywallThisSession,
  markContextualPaywallShownThisSession,
} from "@/hooks/usePaywallTrigger";
