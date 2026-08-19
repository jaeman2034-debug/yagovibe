import type { Value } from "firebase/remote-config";
import { DEFAULT_GROWTH_CONFIG, type ContextualTrigger, type GrowthConfig } from "@/lib/growth/defaults";

const VALID_TRIGGERS: ContextualTrigger[] = ["rank_up", "coach_tease", "streak", "post_match"];

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

function parseNumber(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function parsePlan(raw: string | undefined): GrowthConfig["paywall_default_plan"] {
  return raw === "year" ? "year" : "month";
}

function parsePriority(raw: string | undefined): ContextualTrigger[] {
  if (!raw) return [...DEFAULT_GROWTH_CONFIG.contextual_trigger_priority];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_GROWTH_CONFIG.contextual_trigger_priority];
    const normalized = parsed
      .map((v) => String(v).trim())
      .filter((v): v is ContextualTrigger => VALID_TRIGGERS.includes(v as ContextualTrigger));
    const deduped = Array.from(new Set<ContextualTrigger>(normalized));
    if (deduped.length === 0) return [...DEFAULT_GROWTH_CONFIG.contextual_trigger_priority];
    for (const trigger of VALID_TRIGGERS) {
      if (!deduped.includes(trigger)) {
        deduped.push(trigger);
      }
    }
    return deduped;
  } catch {
    return [...DEFAULT_GROWTH_CONFIG.contextual_trigger_priority];
  }
}

function pickValue(values: Record<string, Value>, key: keyof GrowthConfig): string | undefined {
  return values[key]?.asString();
}

export function resolveGrowthConfig(values?: Record<string, Value>): GrowthConfig {
  if (!values) return { ...DEFAULT_GROWTH_CONFIG };
  return {
    paywall_default_plan: parsePlan(pickValue(values, "paywall_default_plan")),
    paywall_show_annual: parseBool(pickValue(values, "paywall_show_annual"), DEFAULT_GROWTH_CONFIG.paywall_show_annual),
    paywall_annual_emphasis: parseBool(
      pickValue(values, "paywall_annual_emphasis"),
      DEFAULT_GROWTH_CONFIG.paywall_annual_emphasis,
    ),
    coach_tease_headline: pickValue(values, "coach_tease_headline") || DEFAULT_GROWTH_CONFIG.coach_tease_headline,
    coach_tease_cta: pickValue(values, "coach_tease_cta") || DEFAULT_GROWTH_CONFIG.coach_tease_cta,
    coach_tease_subcopy: pickValue(values, "coach_tease_subcopy") || DEFAULT_GROWTH_CONFIG.coach_tease_subcopy,
    rank_up_headline: pickValue(values, "rank_up_headline") || DEFAULT_GROWTH_CONFIG.rank_up_headline,
    rank_up_subcopy: pickValue(values, "rank_up_subcopy") || DEFAULT_GROWTH_CONFIG.rank_up_subcopy,
    streak_headline: pickValue(values, "streak_headline") || DEFAULT_GROWTH_CONFIG.streak_headline,
    streak_subcopy: pickValue(values, "streak_subcopy") || DEFAULT_GROWTH_CONFIG.streak_subcopy,
    contextual_trigger_priority: parsePriority(pickValue(values, "contextual_trigger_priority")),
    discount_offer_enabled: parseBool(
      pickValue(values, "discount_offer_enabled"),
      DEFAULT_GROWTH_CONFIG.discount_offer_enabled,
    ),
    discount_offer_percent: Math.max(
      0,
      Math.min(100, parseNumber(pickValue(values, "discount_offer_percent"), DEFAULT_GROWTH_CONFIG.discount_offer_percent)),
    ),
  };
}

export function toRemoteConfigDefaults(config: GrowthConfig = DEFAULT_GROWTH_CONFIG): Record<string, string> {
  return {
    paywall_default_plan: config.paywall_default_plan,
    paywall_show_annual: String(config.paywall_show_annual),
    paywall_annual_emphasis: String(config.paywall_annual_emphasis),
    coach_tease_headline: config.coach_tease_headline,
    coach_tease_cta: config.coach_tease_cta,
    coach_tease_subcopy: config.coach_tease_subcopy,
    rank_up_headline: config.rank_up_headline,
    rank_up_subcopy: config.rank_up_subcopy,
    streak_headline: config.streak_headline,
    streak_subcopy: config.streak_subcopy,
    contextual_trigger_priority: JSON.stringify(config.contextual_trigger_priority),
    discount_offer_enabled: String(config.discount_offer_enabled),
    discount_offer_percent: String(config.discount_offer_percent),
  };
}
