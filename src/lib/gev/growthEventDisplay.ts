import type { MockGrowthEvent } from "@/components/ai-growth/types";
import { gevV1LabelKo, type GevV1EventKey } from "@/lib/gev/gevV1Events";
import { isGevV1_15Enabled } from "@/lib/fii/fiiFeatureFlags";

export function growthEventDisplayLabel(event: MockGrowthEvent): string {
  if (isGevV1_15Enabled() && event.gevV1Key) {
    return gevV1LabelKo(event.gevV1Key);
  }
  return event.eventType;
}

export function growthEventDisplayCode(event: MockGrowthEvent): string {
  if (isGevV1_15Enabled() && event.gevV1Key) {
    return event.gevV1Key;
  }
  return event.eventType;
}

export function isGevV1EventKey(value: string): value is GevV1EventKey {
  return /^[A-Z_]+$/.test(value) && value !== "SCAN" && value !== "PRESS_RESIST";
}
