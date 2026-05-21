/**
 * 협회 소개 — 이미지 AI 패키지 variant 적용 위치 결정 + Draft/Firestore 패치 계산
 */

import type {
  FederationAboutFields,
  FederationImageContentAppliedTo,
  FederationImageContentSelectionRow,
} from "@/types/federation";
import type { GeneratedContentVariant, ImageContentPackage } from "@/types/imageContentPackage";
import { sanitizeFederationDraftSections, type FederationDraftSectionMap } from "@/services/federationService";

export type DynamicSectionLike = {
  type: string;
  content: string;
  draft?: string | null;
  image?: string;
  aiTitle?: string;
  aiSummary?: string;
  aiTags?: string[];
};

export type IntroSlice = { content: string; draft: string | null; image: string };

const CONTENT_MAX = 900_000;

export function resolveImageAiPlacement(
  recommendedUse: string,
  imageSectionKey: string,
  sectionOrder: string[],
  dynamicSections: Record<string, { type?: string }>
): { appliedTo: FederationImageContentAppliedTo; targetSectionKey: string | null } {
  const idx = sectionOrder.indexOf(imageSectionKey);
  const belowKey =
    idx >= 0 && idx < sectionOrder.length - 1 ? sectionOrder[idx + 1] : null;
  const belowIsText =
    !!belowKey && String(dynamicSections[belowKey]?.type || "") === "text";

  if (recommendedUse === "intro_section") {
    return { appliedTo: "association_intro", targetSectionKey: null };
  }
  if (recommendedUse === "activity_section") {
    return { appliedTo: "association_activities", targetSectionKey: null };
  }
  if (belowIsText && belowKey) {
    return { appliedTo: "dynamic_section", targetSectionKey: belowKey };
  }
  return { appliedTo: "association_intro", targetSectionKey: null };
}

/** 패키지·베스트 variant만으로 `imageContentSelections` 행 생성 (원샷 배치 등, Draft 본문은 별도 compose) */
export function buildFederationImageSelectionRowFromPackage(input: {
  pkg: ImageContentPackage;
  variantIndex: number;
  imageSectionKey: string;
  imageUrl: string;
  federationSlug: string;
  sectionOrder: string[];
  dynamicSections: Record<string, DynamicSectionLike>;
}): FederationImageContentSelectionRow | null {
  const v = input.pkg.variants[input.variantIndex];
  if (!v) return null;
  if (!String(v.content || "").trim()) return null;
  const placement = resolveImageAiPlacement(
    v.recommendedUse,
    input.imageSectionKey,
    input.sectionOrder,
    input.dynamicSections
  );
  return buildSelectionRow({
    pkg: input.pkg,
    variant: v,
    variantIndex: input.variantIndex,
    imageSectionKey: input.imageSectionKey,
    imageUrl: input.imageUrl,
    federationSlug: input.federationSlug,
    placement,
  });
}

function buildSelectionRow(input: {
  pkg: ImageContentPackage;
  variant: GeneratedContentVariant;
  variantIndex: number;
  imageSectionKey: string;
  imageUrl: string;
  federationSlug: string;
  placement: { appliedTo: FederationImageContentAppliedTo; targetSectionKey: string | null };
  isUserEdited?: boolean;
}): FederationImageContentSelectionRow {
  const body = String(input.variant.content || "").trim().slice(0, CONTENT_MAX);
  const tags = (Array.isArray(input.variant.tags) ? input.variant.tags : [])
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .slice(0, 14);
  const row: FederationImageContentSelectionRow = {
    imageId: String(input.pkg.imageId || `${input.federationSlug}__${input.imageSectionKey}`).slice(0, 400),
    imageUrl: String(input.imageUrl || "").trim().slice(0, 2000),
    imageSectionKey: input.imageSectionKey,
    targetSectionKey: input.placement.targetSectionKey,
    selectedVariantIndex: input.variantIndex,
    selectedTone: String(input.variant.tone || ""),
    title: String(input.variant.title || "").trim().slice(0, 200),
    summary: String(input.variant.summary || "").trim().slice(0, 400),
    content: body,
    tags,
    recommendedUse: String(input.variant.recommendedUse || ""),
    appliedTo: input.placement.appliedTo,
  };
  if (input.isUserEdited) {
    row.isUserEdited = true;
    row.editedAt = new Date().toISOString();
  }
  return row;
}

export function computeFederationImageVariantApply(input: {
  variant: GeneratedContentVariant;
  variantIndex: number;
  pkg: ImageContentPackage;
  imageSectionKey: string;
  imageUrl: string;
  federationSlug: string;
  sectionOrder: string[];
  dynamicSections: Record<string, DynamicSectionLike>;
  intro: IntroSlice;
  activitiesLines: string[];
  presidentName: string;
  prevSelections: Record<string, FederationImageContentSelectionRow>;
  contentOverrides?: Partial<Pick<GeneratedContentVariant, "title" | "summary" | "content" | "tags">>;
  markUserEdited?: boolean;
}): {
  nextDynamic: Record<string, DynamicSectionLike>;
  nextIntro: IntroSlice;
  nextActivities: string[];
  nextSelections: Record<string, FederationImageContentSelectionRow>;
  firestorePatch: FederationAboutFields;
  placement: { appliedTo: FederationImageContentAppliedTo; targetSectionKey: string | null };
} | null {
  const ov = input.contentOverrides;
  let tags = Array.isArray(input.variant.tags)
    ? input.variant.tags.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 14)
    : [];
  if (ov?.tags !== undefined) {
    tags = (Array.isArray(ov.tags) ? ov.tags : [])
      .map((t) => String(t || "").trim())
      .filter(Boolean)
      .slice(0, 14);
  }
  const variantNorm: GeneratedContentVariant = {
    ...input.variant,
    tags,
    title: ov?.title !== undefined ? String(ov.title) : input.variant.title,
    summary: ov?.summary !== undefined ? String(ov.summary) : input.variant.summary,
    content: ov?.content !== undefined ? String(ov.content) : input.variant.content,
  };

  const body = String(variantNorm.content || "").trim().slice(0, CONTENT_MAX);
  if (!body) return null;

  const placement = resolveImageAiPlacement(
    input.variant.recommendedUse,
    input.imageSectionKey,
    input.sectionOrder,
    input.dynamicSections
  );

  const row = buildSelectionRow({
    pkg: input.pkg,
    variant: variantNorm,
    variantIndex: input.variantIndex,
    imageSectionKey: input.imageSectionKey,
    imageUrl: input.imageUrl,
    federationSlug: input.federationSlug,
    placement,
    isUserEdited: input.markUserEdited === true,
  });

  const nextSelections = {
    ...input.prevSelections,
    [input.imageSectionKey]: row,
  };

  let nextDynamic: Record<string, DynamicSectionLike> = { ...input.dynamicSections };
  let nextIntro: IntroSlice = { ...input.intro };
  let nextActivities: string[] = [...input.activitiesLines];

  if (placement.appliedTo === "dynamic_section" && placement.targetSectionKey) {
    const key = placement.targetSectionKey;
    const cur = nextDynamic[key] || {
      type: "text",
      content: "",
      draft: null,
      image: "",
    };
    nextDynamic = {
      ...nextDynamic,
      [key]: {
        ...cur,
        type: "text",
        content: body,
        draft: cur.draft ?? null,
        image: String(cur.image ?? ""),
        ...(variantNorm.title.trim() ? { aiTitle: variantNorm.title.trim() } : {}),
        ...(variantNorm.summary.trim() ? { aiSummary: variantNorm.summary.trim() } : {}),
        ...(variantNorm.tags.length ? { aiTags: [...variantNorm.tags] } : {}),
      },
    };
  } else if (placement.appliedTo === "association_intro") {
    nextIntro = {
      ...nextIntro,
      content: body,
    };
  } else if (placement.appliedTo === "association_activities") {
    nextActivities = [body, ...nextActivities.filter((x) => String(x).trim().length > 0)];
  }

  const firestorePatch: FederationAboutFields = {
    imageContentSelections: nextSelections,
  };

  if (placement.appliedTo === "dynamic_section") {
    firestorePatch.sections = sanitizeFederationDraftSections(
      nextDynamic as FederationDraftSectionMap
    ) as FederationAboutFields["sections"];
    firestorePatch.sectionOrder = input.sectionOrder as FederationAboutFields["sectionOrder"];
  }
  if (placement.appliedTo === "association_intro") {
    firestorePatch.introMessage = body;
    firestorePatch.president = {
      name: input.presidentName,
      message: body,
      ...(nextIntro.image ? { photoUrl: nextIntro.image } : {}),
    };
  }
  if (placement.appliedTo === "association_activities") {
    firestorePatch.activities = nextActivities;
  }

  return {
    nextDynamic,
    nextIntro,
    nextActivities,
    nextSelections,
    firestorePatch,
    placement,
  };
}
