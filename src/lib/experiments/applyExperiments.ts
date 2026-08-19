import type { GrowthConfig } from "@/lib/growth/defaults";
import { getGrowthConfigSnapshot } from "@/lib/growth/remoteConfig";
import { assignExperimentVariant } from "@/lib/experiments/assignment";
import { ACTIVE_EXPERIMENT_IDS, EXPERIMENT_REGISTRY } from "@/lib/experiments/registry";

export function applyActiveExperiments(base: GrowthConfig, uid?: string | null): GrowthConfig {
  let config: GrowthConfig = { ...base, contextual_trigger_priority: [...base.contextual_trigger_priority] };
  for (const id of ACTIVE_EXPERIMENT_IDS) {
    const def = EXPERIMENT_REGISTRY[id];
    const variant = assignExperimentVariant(id, uid);
    const patch = def.apply(config, variant);
    config = { ...config, ...patch };
    if (patch.contextual_trigger_priority) {
      config.contextual_trigger_priority = [...patch.contextual_trigger_priority];
    }
  }
  return config;
}

export function getEffectiveGrowthConfig(uid?: string | null): GrowthConfig {
  return applyActiveExperiments(getGrowthConfigSnapshot(), uid);
}
