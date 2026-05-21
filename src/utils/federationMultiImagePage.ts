/**
 * 다중 이미지 → 배치 그룹화 · 대표 선정 · 페이지 초안 구조 (Draft 전용, 이미지당 단일 역할)
 */

import type { FederationImageContentSelectionRow } from "@/types/federation";
import type { RecommendedUse } from "@/types/imageContentPackage";
import {
  sanitizeFederationDraftSections,
  type FederationDraftSectionMap,
} from "@/services/federationService";

const VALID_USE: Set<RecommendedUse> = new Set([
  "hero_banner",
  "intro_section",
  "activity_section",
  "market_post",
  "general_post",
]);

export type FederationMultiImageItem = {
  imageSectionKey: string;
  imageUrl: string;
  imageId: string;
  recommendedUse: RecommendedUse;
  /** 선택 메타·본문 유무 기반 휴리스틱 (0~1) */
  confidence: number;
  /** 현재 sectionOrder 기준 순서 (동률 시 앞선 이미지 우선) */
  orderIndex: number;
};

export type GroupedImagesByPlacement = Record<RecommendedUse, FederationMultiImageItem[]>;

export type AutoPageDraftSection =
  | {
      kind: "hero";
      imageSectionKey: string;
      imageUrl: string;
      sourceImageId: string;
    }
  | {
      kind: "intro_image";
      imageSectionKey: string;
      imageUrl: string;
      sourceImageId: string;
    }
  | {
      kind: "activity_strip";
      imageSectionKeys: string[];
      imageUrls: string[];
      sourceImageIds: string[];
    }
  | {
      kind: "gallery";
      imageSectionKeys: string[];
      imageUrls: string[];
      sourceImageIds: string[];
    }
  | {
      kind: "market_highlight";
      imageSectionKey: string;
      imageUrl: string;
      sourceImageId: string;
    };

/** 페이지 자동 구성(AI) 레이아웃 — 동일 이미지 세트로 역할·순서 가중치만 바꿈 */
export type FederationPageTemplate = "balanced" | "activity_focus" | "intro_focus";

export const FEDERATION_PAGE_TEMPLATES: FederationPageTemplate[] = [
  "balanced",
  "activity_focus",
  "intro_focus",
];

export function parseFederationPageTemplate(raw: string | null | undefined): FederationPageTemplate {
  const s = String(raw || "").trim();
  return FEDERATION_PAGE_TEMPLATES.includes(s as FederationPageTemplate)
    ? (s as FederationPageTemplate)
    : "balanced";
}

export type ComposeMultiImagePageOptions = {
  template?: FederationPageTemplate;
};

export type ComposePageStructureResult = {
  sections: AutoPageDraftSection[];
  /** UI·sectionOrder 패치용: 역할이 부여된 이미지 섹션 키 순서 (중복 없음) */
  proposedImageSectionOrder: string[];
  /** 섹션 키 → 배정 역할·원 추천 슬롯 */
  trace: Record<
    string,
    {
      role: "hero" | "intro" | "activity" | "market" | "gallery";
      fromRecommended: RecommendedUse;
    }
  >;
  /** 적용한 레이아웃 템플릿 (미지정 시 balanced) */
  template: FederationPageTemplate;
};

export function parseRecommendedUseFromLog(raw?: string | null): RecommendedUse {
  const s = String(raw || "").trim() as RecommendedUse;
  return VALID_USE.has(s) ? s : "general_post";
}

/** imageContentSelections 행 기준 휴리스틱 신뢰도 (0~1). AI variant confidence 미저장 시에도 동일 규칙으로 배치·자동 적용 판단에 사용 */
export function federationSelectionConfidence(row: FederationImageContentSelectionRow | undefined | null): number {
  if (!row) return 0;
  const hasBody = String(row.content || "").trim().length > 20;
  return Math.min(1, 0.5 + (hasBody ? 0.12 : 0) + (String(row.title || "").trim() ? 0.05 : 0));
}

/**
 * Draft 동적 섹션 + imageContentSelections 에서 HTTPS 이미지 섹션만 수집
 */
export function collectFederationMultiImageItems(
  sectionOrder: string[],
  dynamicSections: Record<string, { type?: string; image?: string }>,
  selections: Record<string, FederationImageContentSelectionRow>
): FederationMultiImageItem[] {
  const items: FederationMultiImageItem[] = [];
  let orderIndex = 0;
  for (const key of sectionOrder) {
    const sec = dynamicSections[key];
    if (!sec || sec.type !== "image") continue;
    const url = String(sec.image || "").trim();
    if (!url.startsWith("https://")) continue;
    const row = selections[key];
    const recommendedUse = parseRecommendedUseFromLog(row?.recommendedUse);
    const confidence = federationSelectionConfidence(row);
    items.push({
      imageSectionKey: key,
      imageUrl: url,
      imageId: String(row?.imageId || `${key}__draft`).slice(0, 400),
      recommendedUse,
      confidence,
      orderIndex: orderIndex++,
    });
  }
  return items;
}

export function groupImagesByRecommendedUse(items: FederationMultiImageItem[]): GroupedImagesByPlacement {
  const empty = (): GroupedImagesByPlacement => ({
    hero_banner: [],
    intro_section: [],
    activity_section: [],
    market_post: [],
    general_post: [],
  });
  const g = empty();
  for (const it of items) {
    g[it.recommendedUse].push(it);
  }
  for (const k of Object.keys(g) as RecommendedUse[]) {
    g[k].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.orderIndex - b.orderIndex;
    });
  }
  return g;
}

function pickFirstAvailable(
  list: FederationMultiImageItem[] | undefined,
  consumed: Set<string>
): FederationMultiImageItem | null {
  if (!list?.length) return null;
  for (const it of list) {
    if (!consumed.has(it.imageSectionKey)) return it;
  }
  return null;
}

const TEMPLATE_MAX_ACTIVITY: Record<FederationPageTemplate, number> = {
  balanced: 3,
  activity_focus: 4,
  intro_focus: 2,
};

/**
 * 이미지별 단일 역할: 템플릿에 따라 hero·intro·activity 순서·활동 슬롯 수가 달라짐 → market(1) → 나머지 gallery
 */
export function composeFederationMultiImagePageStructure(
  items: FederationMultiImageItem[],
  options?: ComposeMultiImagePageOptions
): ComposePageStructureResult {
  const template = options?.template ?? "balanced";
  const maxActivity = TEMPLATE_MAX_ACTIVITY[template];
  const groups = groupImagesByRecommendedUse(items);
  const consumed = new Set<string>();
  const sections: AutoPageDraftSection[] = [];
  const trace: ComposePageStructureResult["trace"] = {};

  const hero =
    template === "intro_focus"
      ? pickFirstAvailable(groups.hero_banner, consumed) ||
        pickFirstAvailable(groups.activity_section, consumed) ||
        pickFirstAvailable(groups.general_post, consumed) ||
        pickFirstAvailable(groups.intro_section, consumed)
      : pickFirstAvailable(groups.hero_banner, consumed) ||
        pickFirstAvailable(groups.intro_section, consumed) ||
        pickFirstAvailable(groups.activity_section, consumed);

  if (hero) {
    consumed.add(hero.imageSectionKey);
    sections.push({
      kind: "hero",
      imageSectionKey: hero.imageSectionKey,
      imageUrl: hero.imageUrl,
      sourceImageId: hero.imageId,
    });
    trace[hero.imageSectionKey] = { role: "hero", fromRecommended: hero.recommendedUse };
  }

  const pushIntro = () => {
    const introImg = pickFirstAvailable(groups.intro_section, consumed);
    if (!introImg) return;
    consumed.add(introImg.imageSectionKey);
    sections.push({
      kind: "intro_image",
      imageSectionKey: introImg.imageSectionKey,
      imageUrl: introImg.imageUrl,
      sourceImageId: introImg.imageId,
    });
    trace[introImg.imageSectionKey] = { role: "intro", fromRecommended: introImg.recommendedUse };
  };

  const pushActivityStrip = () => {
    const activityPicks: FederationMultiImageItem[] = [];
    for (const it of groups.activity_section) {
      if (consumed.has(it.imageSectionKey)) continue;
      if (activityPicks.length >= maxActivity) break;
      consumed.add(it.imageSectionKey);
      activityPicks.push(it);
    }
    if (template === "activity_focus") {
      for (const it of groups.general_post) {
        if (consumed.has(it.imageSectionKey)) continue;
        if (activityPicks.length >= maxActivity) break;
        consumed.add(it.imageSectionKey);
        activityPicks.push(it);
      }
    }
    if (activityPicks.length === 0) return;
    sections.push({
      kind: "activity_strip",
      imageSectionKeys: activityPicks.map((i) => i.imageSectionKey),
      imageUrls: activityPicks.map((i) => i.imageUrl),
      sourceImageIds: activityPicks.map((i) => i.imageId),
    });
    activityPicks.forEach((it) => {
      trace[it.imageSectionKey] = { role: "activity", fromRecommended: it.recommendedUse };
    });
  };

  if (template === "activity_focus") {
    pushActivityStrip();
    pushIntro();
  } else {
    pushIntro();
    pushActivityStrip();
  }

  const marketFirst = pickFirstAvailable(groups.market_post, consumed);
  if (marketFirst) {
    consumed.add(marketFirst.imageSectionKey);
    sections.push({
      kind: "market_highlight",
      imageSectionKey: marketFirst.imageSectionKey,
      imageUrl: marketFirst.imageUrl,
      sourceImageId: marketFirst.imageId,
    });
    trace[marketFirst.imageSectionKey] = { role: "market", fromRecommended: marketFirst.recommendedUse };
  }

  const remaining = items.filter((it) => !consumed.has(it.imageSectionKey));
  if (remaining.length > 0) {
    sections.push({
      kind: "gallery",
      imageSectionKeys: remaining.map((i) => i.imageSectionKey),
      imageUrls: remaining.map((i) => i.imageUrl),
      sourceImageIds: remaining.map((i) => i.imageId),
    });
    remaining.forEach((it) => {
      trace[it.imageSectionKey] = { role: "gallery", fromRecommended: it.recommendedUse };
    });
  }

  const proposedImageSectionOrder: string[] = [];
  for (const s of sections) {
    if (s.kind === "hero" || s.kind === "intro_image" || s.kind === "market_highlight") {
      proposedImageSectionOrder.push(s.imageSectionKey);
    } else {
      proposedImageSectionOrder.push(...s.imageSectionKeys);
    }
  }

  return { sections, proposedImageSectionOrder, trace, template };
}

/**
 * `intro` 고정 블록 바로 뒤에 제안된 이미지 섹션 키를 끼워 넣고, 나머지 순서는 유지
 */
export function mergeImageSectionOrderForAutoPage(
  currentOrder: string[],
  proposedImageKeys: string[]
): string[] {
  const proposed = [...new Set(proposedImageKeys)];
  if (proposed.length === 0) return [...currentOrder];
  const without = currentOrder.filter((k) => !proposed.includes(k));
  const introIdx = without.indexOf("intro");
  const insertAt = introIdx >= 0 ? introIdx + 1 : 0;
  return [...without.slice(0, insertAt), ...proposed, ...without.slice(insertAt)];
}

const ROLE_LABEL: Record<ComposePageStructureResult["trace"][string]["role"], string> = {
  hero: "대표·히어로",
  intro: "소개 보조 이미지",
  activity: "활동 스트립",
  market: "마켓 하이라이트",
  gallery: "갤러리·기타",
};

const TEMPLATE_LABEL: Record<FederationPageTemplate, string> = {
  balanced: "균형형",
  activity_focus: "활동 강조형",
  intro_focus: "소개 강조형",
};

export function formatAutoPageStructurePreviewLines(result: ComposePageStructureResult): string[] {
  const lines: string[] = [];
  lines.push(`· 레이아웃: ${TEMPLATE_LABEL[result.template]}`);
  for (const s of result.sections) {
    if (s.kind === "hero") {
      const idShort =
        s.sourceImageId.length > 52 ? `${s.sourceImageId.slice(0, 52)}…` : s.sourceImageId;
      lines.push(`· ${ROLE_LABEL.hero}: ${s.imageSectionKey} (추적 ${idShort})`);
    } else if (s.kind === "intro_image") {
      lines.push(`· ${ROLE_LABEL.intro}: ${s.imageSectionKey}`);
    } else if (s.kind === "activity_strip") {
      lines.push(
        `· ${ROLE_LABEL.activity}: ${s.imageSectionKeys.length}장 — ${s.imageSectionKeys.join(", ")}`
      );
    } else if (s.kind === "market_highlight") {
      lines.push(`· ${ROLE_LABEL.market}: ${s.imageSectionKey}`);
    } else if (s.kind === "gallery") {
      lines.push(
        `· ${ROLE_LABEL.gallery}: ${s.imageSectionKeys.length}장 — ${s.imageSectionKeys.join(", ")}`
      );
    }
  }
  return lines;
}

const MAX_PRESIDENT_BODY = 48_000;
const MAX_ACTIVITY_LINE = 800;
const MAX_DYNAMIC_CAPTION = 900_000;

/** 이 미만이면 모달에서 기본적으로 「콘텐츠도 함께 반영」을 끔 (휴리스틱) */
export const FEDERATION_AUTO_CONTENT_CONFIDENCE_THRESHOLD = 0.6;

export type AutoContentImpactSnapshot = {
  introBody: string;
  chairPhotoUrl: string;
  activitiesLines: string[];
  dynamicSections: Record<string, { content?: string; aiTitle?: string; aiSummary?: string; aiTags?: string[] }>;
};

export type DynamicSectionContentPatch = {
  content?: string;
  aiTitle?: string;
  aiSummary?: string;
  aiTags?: string[];
};

/** imageContentSelections 기반 Draft 콘텐츠 패치 (isUserEdited 인 행은 건너뜀) */
export type AutoContentApplyPlan = {
  federationIntroBody?: string;
  chairpersonPhotoUrl?: string;
  activitiesReplacement?: string[];
  dynamicSectionPatches: Record<string, DynamicSectionContentPatch>;
  skippedBecauseUserEdited: string[];
  missingSelectionKeys: string[];
  avgConfidenceForAppliedContent?: number;
};

function dynamicPatchWouldChange(
  cur: { content?: string; aiTitle?: string; aiSummary?: string; aiTags?: string[] } | undefined,
  p: DynamicSectionContentPatch
): boolean {
  if (!cur) return Object.keys(p).length > 0;
  if (p.content !== undefined && String(cur.content ?? "") !== p.content) return true;
  if (p.aiTitle !== undefined && String(cur.aiTitle ?? "") !== p.aiTitle) return true;
  if (p.aiSummary !== undefined && String(cur.aiSummary ?? "") !== p.aiSummary) return true;
  if (p.aiTags && p.aiTags.length > 0) {
    const a = (cur.aiTags ?? []).join("\u0001");
    const b = p.aiTags.join("\u0001");
    if (a !== b) return true;
  }
  return false;
}

function activitiesLinesEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  const x = (a ?? []).map((s) => String(s || "").trim());
  const y = (b ?? []).map((s) => String(s || "").trim());
  if (x.length !== y.length) return false;
  return x.every((v, i) => v === y[i]);
}

/**
 * 현재 Draft 편집 상태 대비, 콘텐츠 반영 시 무엇이 달라지는지 한눈에 (모달용)
 */
export function formatAutoContentImpactLines(
  plan: AutoContentApplyPlan,
  snap: AutoContentImpactSnapshot
): string[] {
  const lines: string[] = [];
  const introWill =
    plan.federationIntroBody !== undefined &&
    String(snap.introBody || "").trim() !== String(plan.federationIntroBody || "").trim();
  const introSame =
    plan.federationIntroBody !== undefined &&
    String(snap.introBody || "").trim() === String(plan.federationIntroBody || "").trim();

  if (introWill) {
    lines.push("✔ 인사말·협회장 본문: 현재 초안과 다름 → AI 문안으로 덮어씁니다.");
  } else if (introSame) {
    lines.push("· 인사말·협회장 본문: 이미 동일한 문안입니다 (덮어쓰기 효과 없음).");
  }

  const photoWill =
    plan.chairpersonPhotoUrl !== undefined &&
    String(snap.chairPhotoUrl || "").trim() !== String(plan.chairpersonPhotoUrl || "").trim();
  if (photoWill) {
    lines.push("✔ 협회장(대표) 사진 URL: Hero/Intro 슬롯 이미지로 바뀝니다.");
  } else if (plan.chairpersonPhotoUrl) {
    lines.push("· 대표 이미지 URL: 현재와 같습니다.");
  }

  const actWill =
    plan.activitiesReplacement !== undefined &&
    !activitiesLinesEqual(snap.activitiesLines, plan.activitiesReplacement);
  if (actWill) {
    const n = plan.activitiesReplacement!.length;
    const m = snap.activitiesLines.length;
    lines.push(`✔ 주요 활동: ${m}줄 → ${n}줄로 치환됩니다.`);
  } else if (plan.activitiesReplacement) {
    lines.push("· 주요 활동: 이미 동일한 줄입니다.");
  }

  let patchChangeCount = 0;
  for (const [key, p] of Object.entries(plan.dynamicSectionPatches)) {
    if (dynamicPatchWouldChange(snap.dynamicSections[key], p)) patchChangeCount++;
  }
  if (patchChangeCount > 0) {
    lines.push(`✔ 갤러리·마켓 등 이미지 섹션 ${patchChangeCount}곳: 캡션·메타가 바뀝니다.`);
  } else if (Object.keys(plan.dynamicSectionPatches).length > 0) {
    lines.push("· 이미지 섹션 캡션·메타: 현재와 같아 변경 효과가 없습니다.");
  }

  const skip = plan.skippedBecauseUserEdited.length;
  if (skip > 0) {
    const keys = plan.skippedBecauseUserEdited.slice(0, 4).join(", ");
    lines.push(
      `⚠ 사용자가 수정한 메타 ${skip}건은 자동 반영에서 제외됩니다 (${keys}${skip > 4 ? " …" : ""}).`
    );
  }

  const miss = plan.missingSelectionKeys.length;
  if (miss > 0) {
    const keys = plan.missingSelectionKeys.slice(0, 4).join(", ");
    lines.push(
      `ℹ 선택 메타 없음(AI 미적용 등) ${miss}건 — 해당 슬롯은 문구가 비어 있을 수 있습니다 (${keys}${miss > 4 ? " …" : ""}).`
    );
  }

  if (lines.length === 0) {
    lines.push("· 적용될 텍스트·메타 변경 없음 (섹션 순서만 바뀝니다).");
  }

  return lines;
}

function selectionBodyForFederation(row: FederationImageContentSelectionRow): string {
  const summ = String(row.summary || "").trim();
  const body = String(row.content || "").trim();
  if (summ && body && summ !== body) {
    return `${summ}\n\n${body}`.trim().slice(0, MAX_PRESIDENT_BODY);
  }
  return (body || summ).slice(0, MAX_PRESIDENT_BODY);
}

function canUseSelection(
  key: string,
  selections: Record<string, FederationImageContentSelectionRow>,
  skipped: string[],
  missing: string[]
): FederationImageContentSelectionRow | null {
  const s = selections[key];
  if (!s) {
    missing.push(key);
    return null;
  }
  if (s.isUserEdited === true) {
    skipped.push(key);
    return null;
  }
  return s;
}

/**
 * 페이지 구조 + imageContentSelections → Draft에 넣을 콘텐츠 패치 계산
 * - hero: 인사말·협회장 사진
 * - hero에 쓸 선택이 없으면 intro_image 슬롯이 동일 역할
 * - activity_strip: 활동 줄 목록(치환)
 * - gallery / market_highlight: 해당 이미지 섹션의 content·ai* 메타
 */
export function buildAutoContentPlan(
  structure: ComposePageStructureResult,
  selections: Record<string, FederationImageContentSelectionRow>
): AutoContentApplyPlan {
  const skipped: string[] = [];
  const missing: string[] = [];
  const patches: Record<string, DynamicSectionContentPatch> = {};
  const appliedConfidences: number[] = [];
  let federationIntroBody: string | undefined;
  let chairpersonPhotoUrl: string | undefined;
  let heroContentApplied = false;

  for (const sec of structure.sections) {
    if (sec.kind !== "hero") continue;
    const row = canUseSelection(sec.imageSectionKey, selections, skipped, missing);
    if (!row) continue;
    const text = selectionBodyForFederation(row);
    if (!text) continue;
    federationIntroBody = text;
    chairpersonPhotoUrl = sec.imageUrl;
    appliedConfidences.push(federationSelectionConfidence(row));
    heroContentApplied = true;
    break;
  }

  if (!heroContentApplied) {
    for (const sec of structure.sections) {
      if (sec.kind !== "intro_image") continue;
      const row = canUseSelection(sec.imageSectionKey, selections, skipped, missing);
      if (!row) continue;
      const text = selectionBodyForFederation(row);
      if (!text) continue;
      federationIntroBody = text;
      chairpersonPhotoUrl = sec.imageUrl;
      appliedConfidences.push(federationSelectionConfidence(row));
      break;
    }
  }

  const activityLines: string[] = [];
  for (const sec of structure.sections) {
    if (sec.kind !== "activity_strip") continue;
    for (const key of sec.imageSectionKeys) {
      const row = canUseSelection(key, selections, skipped, missing);
      if (!row) continue;
      const raw =
        String(row.content || "")
          .trim()
          .split(/\n+/)[0] || String(row.summary || "").trim();
      const line = raw.slice(0, MAX_ACTIVITY_LINE);
      if (line) {
        activityLines.push(line);
        appliedConfidences.push(federationSelectionConfidence(row));
      }
    }
  }

  for (const sec of structure.sections) {
    if (sec.kind === "gallery") {
      for (const key of sec.imageSectionKeys) {
        const row = canUseSelection(key, selections, skipped, missing);
        if (!row) continue;
        const body = String(row.content || "").trim().slice(0, MAX_DYNAMIC_CAPTION);
        const title = String(row.title || "").trim().slice(0, 200);
        const summary = String(row.summary || "").trim().slice(0, 400);
        const tags = Array.isArray(row.tags)
          ? row.tags.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 14)
          : [];
        if (!body && !title && !summary && tags.length === 0) continue;
        patches[key] = {
          ...(body ? { content: body } : {}),
          ...(title ? { aiTitle: title } : {}),
          ...(summary ? { aiSummary: summary } : {}),
          ...(tags.length ? { aiTags: tags } : {}),
        };
        appliedConfidences.push(federationSelectionConfidence(row));
      }
    }
    if (sec.kind === "market_highlight") {
      const key = sec.imageSectionKey;
      const row = canUseSelection(key, selections, skipped, missing);
      if (!row) continue;
      const body = String(row.content || "").trim().slice(0, MAX_DYNAMIC_CAPTION);
      const title = String(row.title || "").trim().slice(0, 200);
      const summary = String(row.summary || "").trim().slice(0, 400);
      const tags = Array.isArray(row.tags)
        ? row.tags.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 14)
        : [];
      if (!body && !title && !summary && tags.length === 0) continue;
      patches[key] = {
        ...(body ? { content: body } : {}),
        ...(title ? { aiTitle: title } : {}),
        ...(summary ? { aiSummary: summary } : {}),
        ...(tags.length ? { aiTags: tags } : {}),
      };
      appliedConfidences.push(federationSelectionConfidence(row));
    }
  }

  const avgConfidenceForAppliedContent =
    appliedConfidences.length > 0
      ? appliedConfidences.reduce((a, b) => a + b, 0) / appliedConfidences.length
      : undefined;

  return {
    federationIntroBody,
    chairpersonPhotoUrl,
    activitiesReplacement: activityLines.length > 0 ? activityLines : undefined,
    dynamicSectionPatches: patches,
    skippedBecauseUserEdited: [...new Set(skipped)],
    missingSelectionKeys: [...new Set(missing)],
    avgConfidenceForAppliedContent,
  };
}

export function formatAutoContentPlanPreview(plan: AutoContentApplyPlan, maxChars = 160): string[] {
  const lines: string[] = [];
  if (plan.federationIntroBody) {
    const t =
      plan.federationIntroBody.length > maxChars
        ? `${plan.federationIntroBody.slice(0, maxChars)}…`
        : plan.federationIntroBody;
    lines.push(`인사말·협회장 본문: ${t.replace(/\s+/g, " ")}`);
  } else {
    lines.push("인사말·협회장 본문: (적용 없음 — hero/intro 선택 없음 또는 사용자 수정 보호)");
  }
  if (plan.chairpersonPhotoUrl) {
    lines.push(`협회장 사진 URL: 반영 예정 (대표 이미지)`);
  }
  if (plan.activitiesReplacement?.length) {
    lines.push(`주요 활동: ${plan.activitiesReplacement.length}줄로 Draft 치환`);
    plan.activitiesReplacement.slice(0, 3).forEach((ln, i) => {
      const short = ln.length > maxChars ? `${ln.slice(0, maxChars)}…` : ln;
      lines.push(`  ${i + 1}. ${short}`);
    });
    if (plan.activitiesReplacement.length > 3) lines.push(`  … 외 ${plan.activitiesReplacement.length - 3}줄`);
  } else {
    lines.push("주요 활동: (변경 없음)");
  }
  const patchKeys = Object.keys(plan.dynamicSectionPatches);
  lines.push(
    patchKeys.length > 0
      ? `이미지 섹션 캡션/메타 패치: ${patchKeys.length}개 (${patchKeys.join(", ")})`
      : "이미지 섹션 캡션/메타: (갤러리·마켓 슬롯에 해당 없음)"
  );
  if (plan.skippedBecauseUserEdited.length > 0) {
    lines.push(`건너뜀(사용자 수정됨): ${plan.skippedBecauseUserEdited.join(", ")}`);
  }
  if (plan.missingSelectionKeys.length > 0) {
    lines.push(`선택 메타 없음(AI 미적용 등): ${plan.missingSelectionKeys.join(", ")}`);
  }
  if (plan.avgConfidenceForAppliedContent !== undefined) {
    const pct = Math.round(plan.avgConfidenceForAppliedContent * 100);
    lines.push(`반영 대상 문안·메타 평균 신뢰도(휴리스틱): 약 ${pct}%`);
  }
  return lines;
}

/**
 * 다중 이미지 compose 결과 → Draft 패치 및 다음 로컬 상태 (Firestore `undefined` 키 없음)
 */
export function computeMultiImageComposeDraftPatch(input: {
  sectionOrder: string[];
  dynamicSections: Record<string, unknown>;
  intro: { content: string; image: string };
  activitiesLines: string[];
  presidentName: string;
  structure: ComposePageStructureResult;
  plan: AutoContentApplyPlan;
  applyContent: boolean;
}): {
  nextOrder: string[];
  nextDynamic: Record<string, unknown>;
  nextIntro: { content: string; image: string };
  nextActivitiesLines: string[];
  draftPatch: Record<string, unknown>;
} {
  const nextOrder = mergeImageSectionOrderForAutoPage(
    input.sectionOrder,
    input.structure.proposedImageSectionOrder
  );
  const nextDynamic = JSON.parse(JSON.stringify(input.dynamicSections || {})) as Record<string, unknown>;

  if (input.applyContent) {
    for (const [key, p] of Object.entries(input.plan.dynamicSectionPatches)) {
      if (!nextDynamic[key]) continue;
      const cur = nextDynamic[key] as Record<string, unknown>;
      nextDynamic[key] = {
        ...cur,
        ...(p.content !== undefined && p.content !== "" ? { content: p.content } : {}),
        ...(p.aiTitle ? { aiTitle: p.aiTitle } : {}),
        ...(p.aiSummary ? { aiSummary: p.aiSummary } : {}),
        ...(p.aiTags && p.aiTags.length > 0 ? { aiTags: [...p.aiTags] } : {}),
      };
    }
  }

  let nextIntro = { content: input.intro.content, image: input.intro.image };
  let nextActivitiesLines = [...input.activitiesLines];
  if (input.applyContent) {
    if (input.plan.federationIntroBody !== undefined) {
      nextIntro = {
        content: input.plan.federationIntroBody,
        image: input.plan.chairpersonPhotoUrl || input.intro.image,
      };
    }
    if (input.plan.activitiesReplacement !== undefined) {
      nextActivitiesLines = [...input.plan.activitiesReplacement];
    }
  }

  const draftPatch: Record<string, unknown> = {
    sectionOrder: nextOrder,
    sections: sanitizeFederationDraftSections(nextDynamic as FederationDraftSectionMap) as unknown,
  };

  if (input.applyContent) {
    if (input.plan.federationIntroBody !== undefined) {
      draftPatch.introMessage = input.plan.federationIntroBody;
      draftPatch.president = {
        name: input.presidentName,
        message: input.plan.federationIntroBody,
        ...(input.plan.chairpersonPhotoUrl ? { photoUrl: input.plan.chairpersonPhotoUrl } : {}),
      };
    }
    if (input.plan.chairpersonPhotoUrl !== undefined) {
      draftPatch.chairpersonPhotoUrl = input.plan.chairpersonPhotoUrl;
    }
    if (input.plan.activitiesReplacement !== undefined) {
      draftPatch.activities = input.plan.activitiesReplacement;
    }
  }

  return { nextOrder, nextDynamic, nextIntro, nextActivitiesLines, draftPatch };
}
