import type {
  MatchBehavior,
  MatchMode,
  MatchSport,
  UnifiedMatchConfig,
} from "./types";

/** Behavior matrix SoT — demo | practice | live × sport */
export function resolveMatchBehavior(config: UnifiedMatchConfig): MatchBehavior {
  const base = modeBase(config.mode);
  const sportOverrides = sportAdjustments(config.sport, config.mode);

  return {
    config,
    ...base,
    ...sportOverrides,
  };
}

function modeBase(mode: MatchMode): Omit<MatchBehavior, "config"> {
  switch (mode) {
    case "demo":
      return {
        input: "scripted",
        scoring: "scripted",
        networking: false,
        ai: "choreography",
        clientXpTrial: true,
        telemetry: false,
        autoDemoLoop: true,
        manualInput: false,
      };
    case "practice":
      return {
        input: "local",
        scoring: "practice_reset",
        networking: false,
        ai: "none",
        clientXpTrial: true,
        telemetry: false,
        autoDemoLoop: false,
        manualInput: true,
      };
    case "live":
      return {
        input: "network",
        scoring: "official",
        networking: true,
        ai: "assist",
        clientXpTrial: false,
        telemetry: true,
        autoDemoLoop: false,
        manualInput: true,
      };
  }
}

function sportAdjustments(
  sport: MatchSport,
  mode: MatchMode,
): Partial<Omit<MatchBehavior, "config">> {
  if (mode !== "demo") return {};

  if (sport === "1v1") {
    return { ai: "choreography" };
  }

  // 5v5 / 8v8 demo — formation choreography (9B)
  return { ai: "choreography" };
}

/** Guard for legacy scenes during migration */
export function isLegacyPlaygroundDemo(config: UnifiedMatchConfig): boolean {
  return config.sport === "1v1" && config.mode === "demo";
}

export function isLegacyLiveMatch(config: UnifiedMatchConfig): boolean {
  return config.sport === "1v1" && config.mode === "live";
}
