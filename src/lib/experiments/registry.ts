/**
 * TRACK 8C Sprint 2 — monetization experiment registry.
 */
import type { ContextualTrigger, GrowthConfig } from "@/lib/growth/defaults";
import type { YagoProPaywallSurface } from "@/lib/analytics/yagoProFunnel";

export type ExperimentVariant = "A" | "B";

export type ExperimentId = "coach_tease_copy_test_v1" | "trigger_priority_test_v1";

export type ExperimentDefinition = {
  id: ExperimentId;
  enabled: boolean;
  /** Surfaces where paywall exposure attaches this experiment to analytics */
  exposureSurfaces: YagoProPaywallSurface[];
  apply: (base: GrowthConfig, variant: ExperimentVariant) => Partial<GrowthConfig>;
};

const TRIGGER_PRIORITY_A: ContextualTrigger[] = ["rank_up", "coach_tease", "streak", "post_match"];
const TRIGGER_PRIORITY_B: ContextualTrigger[] = ["coach_tease", "rank_up", "streak", "post_match"];

export const EXPERIMENT_REGISTRY: Record<ExperimentId, ExperimentDefinition> = {
  coach_tease_copy_test_v1: {
    id: "coach_tease_copy_test_v1",
    enabled: true,
    exposureSurfaces: ["coach_tease"],
    apply(_base, variant) {
      if (variant === "B") {
        return {
          coach_tease_headline: "See every coaching insight from your matches",
        };
      }
      return {
        coach_tease_headline: "Unlock full AI Coach history",
      };
    },
  },
  trigger_priority_test_v1: {
    id: "trigger_priority_test_v1",
    enabled: true,
    exposureSurfaces: ["rank_up", "streak", "post_match", "coach_tease"],
    apply(_base, variant) {
      return {
        contextual_trigger_priority: variant === "B" ? [...TRIGGER_PRIORITY_B] : [...TRIGGER_PRIORITY_A],
      };
    },
  },
};

export const ACTIVE_EXPERIMENT_IDS = Object.values(EXPERIMENT_REGISTRY)
  .filter((e) => e.enabled)
  .map((e) => e.id);
