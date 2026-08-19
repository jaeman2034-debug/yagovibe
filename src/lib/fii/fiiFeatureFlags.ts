/** Phase 1 — AI Sports Intelligence OS (Growth MVP 훼손 방지용 Feature Flag) */

export function isFiiEngineV1Enabled(): boolean {
  const v = import.meta.env.VITE_FII_ENGINE_V1 as string | undefined;
  if (v === "false" || v === "0") return false;
  if (v === "true" || v === "1") return true;
  return true;
}

export function isGevV1_15Enabled(): boolean {
  const v = import.meta.env.VITE_GEV_V1_15 as string | undefined;
  if (v === "false" || v === "0") return false;
  if (v === "true" || v === "1") return true;
  return true;
}

export function isTacticalAgentV1Enabled(): boolean {
  const v = import.meta.env.VITE_TACTICAL_AGENT_V1 as string | undefined;
  if (v === "false" || v === "0") return false;
  if (v === "true" || v === "1") return true;
  return true;
}
