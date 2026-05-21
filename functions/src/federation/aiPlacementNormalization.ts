/**
 * 집계·비교용 배치 정규화 (로그 원본 필드는 변경하지 않음)
 */

export type NormalizedPlacement =
  | "intro_section"
  | "activity_section"
  | "general_post"
  | "market_post"
  | "hero_banner"
  | "unknown";

export function normalizePlacement(use?: string | null): NormalizedPlacement {
  const u = String(use ?? "").trim();
  if (!u) return "unknown";

  if (u.startsWith("dynamic_section:")) {
    return "general_post";
  }

  if (u === "association_intro" || u === "intro_section") {
    return "intro_section";
  }

  if (u === "association_activities" || u === "activity_section") {
    return "activity_section";
  }

  if (u === "market_post") {
    return "market_post";
  }

  if (u === "hero_banner") {
    return "hero_banner";
  }

  if (u === "general_post") {
    return "general_post";
  }

  return "unknown";
}
