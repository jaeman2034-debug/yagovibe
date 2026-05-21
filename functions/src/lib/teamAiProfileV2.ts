/**
 * teams.aiProfile v2: generated(AI) / edited(수동) / meta
 * 레거시(flat) 문서는 parseV2OrMigrate 로 흡수한다.
 */
export const AI_PROFILE_SCHEMA_VERSION = 2;

export function isV2AiProfile(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  return (raw as { schemaVersion?: unknown }).schemaVersion === AI_PROFILE_SCHEMA_VERSION;
}

export function legacyFlatToV2(prev: Record<string, unknown> | null): {
  generated: Record<string, unknown>;
  edited: Record<string, unknown>;
  meta: Record<string, unknown>;
} {
  const p = prev || {};
  const highlightsRaw = Array.isArray(p.homeHighlights)
    ? (p.homeHighlights as unknown[])
    : Array.isArray(p.highlights)
      ? (p.highlights as unknown[])
      : [];
  const highlights = highlightsRaw
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 12);
  const desc =
    (typeof p.description === "string" && p.description) ||
    (typeof p.intro === "string" && p.intro) ||
    "";
  const generated = {
    description: desc,
    intro: typeof p.intro === "string" && p.intro ? p.intro : desc,
    highlights,
    recruitMessage: typeof p.recruitMessage === "string" ? p.recruitMessage : "",
    publicCta: typeof p.publicCta === "string" && p.publicCta.trim() ? p.publicCta.trim() : "클럽 합류하기",
    slogan: typeof p.slogan === "string" ? p.slogan : "",
    playStyle: typeof p.playStyle === "string" ? p.playStyle : "",
    themePreset: p.themePreset === "dark" || p.themePreset === "light" ? p.themePreset : "light",
  };
  const meta: Record<string, unknown> = {
    brandStyle: p.brandStyle,
    onboarding: p.onboarding,
    source: typeof p.source === "string" ? p.source : "template",
    aiSkipped: p.aiSkipped === true,
    isFirstGenerated: typeof p.isFirstGenerated === "boolean" ? p.isFirstGenerated : true,
  };
  if (p.generatedAt !== undefined) meta.generatedAt = p.generatedAt;
  if (p.lastRegeneratedAt !== undefined) meta.lastRegeneratedAt = p.lastRegeneratedAt;
  if (p.lastManualEditedAt !== undefined) meta.lastManualEditedAt = p.lastManualEditedAt;
  return { generated, edited: {}, meta };
}

export function parseV2OrMigrate(raw: unknown): {
  generated: Record<string, unknown>;
  edited: Record<string, unknown>;
  meta: Record<string, unknown>;
} {
  if (isV2AiProfile(raw)) {
    const r = raw as Record<string, unknown>;
    const gen =
      r.generated && typeof r.generated === "object" && !Array.isArray(r.generated)
        ? { ...(r.generated as Record<string, unknown>) }
        : {};
    const ed =
      r.edited && typeof r.edited === "object" && !Array.isArray(r.edited)
        ? { ...(r.edited as Record<string, unknown>) }
        : {};
    const meta =
      r.meta && typeof r.meta === "object" && !Array.isArray(r.meta)
        ? { ...(r.meta as Record<string, unknown>) }
        : {};
    return { generated: gen, edited: ed, meta };
  }
  return legacyFlatToV2(raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null);
}
