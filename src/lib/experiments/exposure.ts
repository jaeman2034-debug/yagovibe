/**
 * TRACK 8C Sprint 2 — attach experiments only on actual paywall exposure (not assignment).
 */
import { assignExperimentVariant } from "@/lib/experiments/assignment";
import { ACTIVE_EXPERIMENT_IDS, EXPERIMENT_REGISTRY, type ExperimentVariant } from "@/lib/experiments/registry";
import type { YagoProPaywallSurface } from "@/lib/analytics/yagoProFunnel";

export type ExperimentExposure = {
  id: string;
  variant: ExperimentVariant;
};

export function getExperimentsForExposure(
  surface: YagoProPaywallSurface,
  uid?: string | null,
): ExperimentExposure[] {
  const exposures: ExperimentExposure[] = [];
  for (const id of ACTIVE_EXPERIMENT_IDS) {
    const def = EXPERIMENT_REGISTRY[id];
    if (!def.exposureSurfaces.includes(surface)) continue;
    exposures.push({
      id: def.id,
      variant: assignExperimentVariant(id, uid),
    });
  }
  return exposures;
}

export type ExperimentAnalyticsPayload = {
  experiments: ExperimentExposure[];
  /** @deprecated first experiment — use experiments[] */
  experiment_id?: string;
  /** @deprecated first experiment A/B — use experiments[]; named to avoid paywall `variant` collision */
  experiment_variant?: ExperimentVariant;
};

export function toExperimentAnalyticsPayload(
  surface: YagoProPaywallSurface,
  uid?: string | null,
): ExperimentAnalyticsPayload {
  const experiments = getExperimentsForExposure(surface, uid);
  const first = experiments[0];
  return {
    experiments,
    experiment_id: first?.id,
    experiment_variant: first?.variant,
  };
}
