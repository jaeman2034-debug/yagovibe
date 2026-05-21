/**
 * 협회 소개 — HTTPS 이미지 섹션 다건 AI 패키지(병렬) → multi-image compose → Draft 패치 계산 (원샷)
 */

import { fetchFederationImageContentPackage } from "@/services/federationService";
import type { FederationImageContentSelectionRow } from "@/types/federation";
import type { ImageContentPackage } from "@/types/imageContentPackage";
import { buildFederationImageSelectionRowFromPackage } from "@/utils/federationImageContentApply";
import {
  buildAutoContentPlan,
  collectFederationMultiImageItems,
  composeFederationMultiImagePageStructure,
  computeMultiImageComposeDraftPatch,
  FEDERATION_AUTO_CONTENT_CONFIDENCE_THRESHOLD,
  federationSelectionConfidence,
  type FederationPageTemplate,
} from "@/utils/federationMultiImagePage";

/** 업로드 후 자동 원샷: 최소 HTTPS 이미지 섹션 개수 */
export const FEDERATION_AUTO_BATCH_MIN_HTTPS_IMAGES = 3;

/** 자동 실행 시 기존 선택 메타 평균 신뢰도(휴리스틱) 하한 — 메타가 없으면 통과 */
export const FEDERATION_AUTO_BATCH_PRIOR_CONFIDENCE_MIN = 0.6;

/** 업로드 자동 원샷 과실행 방지 (ms) — 탭에서 localStorage와 함께 사용 */
export const FEDERATION_AUTO_BATCH_COOLDOWN_MS = 30_000;

/** 엔진 내부 진행 (탭·훅에서 UI용 BatchAutoBuildProgress 로 매핑) */
export type FederationBatchEnginePhase =
  | { phase: "generating"; done: number; total: number }
  | { phase: "composing" }
  | { phase: "saving" };

export type DynamicSectionLike = {
  type?: string;
  content?: string;
  draft?: string | null;
  image?: string;
  aiTitle?: string;
  aiSummary?: string;
  aiTags?: string[];
};

export function listHttpsImageSectionKeys(
  sectionOrder: string[],
  dynamicSections: Record<string, DynamicSectionLike>
): string[] {
  const keys: string[] = [];
  for (const k of sectionOrder) {
    const sec = dynamicSections[k];
    if (!sec || sec.type !== "image") continue;
    const url = String(sec.image || "").trim();
    if (url.startsWith("https://")) keys.push(k);
  }
  return keys;
}

/** HTTPS 이미지 섹션 키·URL 스냅샷 — 자동 원샷 idempotency·쿨다운과 무관하게 동일 페이지면 스킵 */
export function buildFederationAutoBatchFingerprint(
  sectionOrder: string[],
  dynamicSections: Record<string, DynamicSectionLike>
): string {
  const keys = listHttpsImageSectionKeys(sectionOrder, dynamicSections);
  return keys
    .slice()
    .sort()
    .map((k) => `${k}:${String(dynamicSections[k]?.image ?? "").trim()}`)
    .join("|");
}

function skipReasonForAuto(
  key: string,
  url: string,
  prev: Record<string, FederationImageContentSelectionRow>
): string | null {
  const existing = prev[key];
  if (existing?.isUserEdited === true && existing.imageUrl === url) {
    return "user_edited";
  }
  if (
    existing &&
    existing.imageUrl === url &&
    String(existing.content || "").trim().length > 0 &&
    !existing.isUserEdited
  ) {
    return "already_has_ai";
  }
  return null;
}

/**
 * 업로드 직후 자동 원샷을 돌려도 될지 (토글 ON일 때만 호출)
 * - HTTPS 이미지 섹션 ≥ minImages
 * - 사용자 수정된 imageContentSelections 없음
 * - 이미 메타가 있는 이미지가 있으면 평균 신뢰도 ≥ priorMin, 없으면 통과(첫 배치)
 */
export function shouldAutoRunFederationBatch(opts: {
  sectionOrder: string[];
  dynamicSections: Record<string, DynamicSectionLike>;
  selections: Record<string, FederationImageContentSelectionRow>;
  minImages?: number;
  priorConfidenceMin?: number;
}): boolean {
  const min = opts.minImages ?? FEDERATION_AUTO_BATCH_MIN_HTTPS_IMAGES;
  const priorMin = opts.priorConfidenceMin ?? FEDERATION_AUTO_BATCH_PRIOR_CONFIDENCE_MIN;
  const keys = listHttpsImageSectionKeys(opts.sectionOrder, opts.dynamicSections);
  if (keys.length < min) return false;
  if (Object.values(opts.selections).some((r) => r.isUserEdited === true)) return false;
  const confs: number[] = [];
  for (const k of keys) {
    const row = opts.selections[k];
    if (row) confs.push(federationSelectionConfidence(row));
  }
  if (confs.length === 0) return true;
  const avg = confs.reduce((a, b) => a + b, 0) / confs.length;
  return avg >= priorMin;
}

export type BatchOneShotResult =
  | {
      ok: true;
      nextSelections: Record<string, FederationImageContentSelectionRow>;
      draftPatch: Record<string, unknown>;
      nextOrder: string[];
      nextDynamic: Record<string, DynamicSectionLike>;
      nextIntro: { content: string; image: string };
      nextActivitiesLines: string[];
      applyContent: boolean;
      avgConfidence?: number;
      failures: { key: string; error: string }[];
      skipped: { key: string; reason: string }[];
      fetchAttemptCount: number;
      fetchSuccessCount: number;
    }
  | {
      ok: false;
      error: string;
      cancelled?: boolean;
      failures?: { key: string; error: string }[];
      skipped?: { key: string; reason: string }[];
    };

export async function runFederationBatchOneShot(options: {
  federationSlug: string;
  sectionOrder: string[];
  dynamicSections: Record<string, DynamicSectionLike>;
  intro: { content: string; image: string };
  activitiesLines: string[];
  presidentName: string;
  prevSelections: Record<string, FederationImageContentSelectionRow>;
  context?: {
    federationName?: string;
    sport?: string;
    region?: string;
  };
  onProgress?: (p: FederationBatchEnginePhase) => void;
  onImageGenerated?: (info: { key: string; pkg: ImageContentPackage; variantIndex: number }) => void;
  forceRegenerate?: boolean;
  /** true면 생성·구성 단계에서 중단하고 Draft는 건드리지 않음 */
  shouldAbort?: () => boolean;
  /** 페이지 자동 구성 레이아웃 (기본 balanced) */
  pageTemplate?: FederationPageTemplate;
}): Promise<BatchOneShotResult> {
  const {
    federationSlug,
    sectionOrder,
    dynamicSections,
    intro,
    activitiesLines,
    presidentName,
    prevSelections,
    context,
    onProgress,
    onImageGenerated,
    forceRegenerate,
    shouldAbort,
    pageTemplate,
  } = options;

  const imageKeys = listHttpsImageSectionKeys(sectionOrder, dynamicSections);
  if (imageKeys.length < 2) {
    return { ok: false, error: "HTTPS 이미지 섹션이 2개 이상 필요합니다." };
  }
  if (shouldAbort?.()) {
    return { ok: false, error: "취소되었습니다.", cancelled: true, failures: [], skipped: [] };
  }

  const failures: { key: string; error: string }[] = [];
  const skipped: { key: string; reason: string }[] = [];
  const keysToFetch: string[] = [];

  for (const key of imageKeys) {
    const url = String(dynamicSections[key]?.image || "").trim();
    if (!forceRegenerate) {
      const skip = skipReasonForAuto(key, url, prevSelections);
      if (skip) {
        skipped.push({ key, reason: skip });
        continue;
      }
    } else {
      const existing = prevSelections[key];
      if (existing?.isUserEdited === true && existing.imageUrl === url) {
        skipped.push({ key, reason: "user_edited" });
        continue;
      }
    }
    keysToFetch.push(key);
  }

  let nextSelections: Record<string, FederationImageContentSelectionRow> = { ...prevSelections };
  const packagesByKey: Record<string, ImageContentPackage> = {};

  const total = Math.max(1, keysToFetch.length);
  onProgress?.({ phase: "generating", done: 0, total });

  if (keysToFetch.length > 0) {
    let done = 0;
    await Promise.all(
      keysToFetch.map(async (key) => {
        const url = String(dynamicSections[key]?.image || "").trim();
        try {
          const pkg = await fetchFederationImageContentPackage({
            imageUrl: url,
            federationSlug,
            imageId: `${federationSlug}__${key}`,
            context: {
              federationName: context?.federationName,
              sport: context?.sport,
              region: context?.region,
            },
            regenerateCount: 0,
          });
          packagesByKey[key] = pkg;
          const maxIdx = Math.max(0, pkg.variants.length - 1);
          const sel = Math.min(Math.max(0, pkg.bestVariantIndex), maxIdx);
          onImageGenerated?.({ key, pkg, variantIndex: sel });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          failures.push({ key, error: msg });
        } finally {
          done += 1;
          onProgress?.({ phase: "generating", done, total });
        }
      })
    );
  } else {
    onProgress?.({ phase: "generating", done: 1, total: 1 });
  }

  if (shouldAbort?.()) {
    return { ok: false, error: "취소되었습니다.", cancelled: true, failures, skipped };
  }

  for (const key of imageKeys) {
    const pkg = packagesByKey[key];
    if (!pkg) continue;
    const url = String(dynamicSections[key]?.image || "").trim();
    const maxIdx = Math.max(0, pkg.variants.length - 1);
    const sel = Math.min(Math.max(0, pkg.bestVariantIndex), maxIdx);
    const row = buildFederationImageSelectionRowFromPackage({
      pkg,
      variantIndex: sel,
      imageSectionKey: key,
      imageUrl: url,
      federationSlug,
      sectionOrder,
      dynamicSections,
    });
    if (row) {
      nextSelections = { ...nextSelections, [key]: row };
    }
  }

  if (shouldAbort?.()) {
    return { ok: false, error: "취소되었습니다.", cancelled: true, failures, skipped };
  }

  onProgress?.({ phase: "composing" });

  const items = collectFederationMultiImageItems(sectionOrder, dynamicSections, nextSelections);
  if (items.length < 2) {
    return {
      ok: false,
      error:
        "배치 가능한 HTTPS 이미지가 2장 미만입니다. AI 생성 실패·건너뜀을 확인하거나 이미지 URL을 확인해 주세요.",
      failures,
      skipped,
    };
  }

  const structure = composeFederationMultiImagePageStructure(items, {
    template: pageTemplate ?? "balanced",
  });
  const plan = buildAutoContentPlan(structure, nextSelections);
  const applyContent =
    plan.avgConfidenceForAppliedContent === undefined ||
    plan.avgConfidenceForAppliedContent >= FEDERATION_AUTO_CONTENT_CONFIDENCE_THRESHOLD;

  if (shouldAbort?.()) {
    return { ok: false, error: "취소되었습니다.", cancelled: true, failures, skipped };
  }

  onProgress?.({ phase: "saving" });

  const composed = computeMultiImageComposeDraftPatch({
    sectionOrder,
    dynamicSections: dynamicSections as Record<string, unknown>,
    intro,
    activitiesLines,
    presidentName,
    structure,
    plan,
    applyContent,
  });

  const draftPatch = { ...composed.draftPatch, imageContentSelections: nextSelections };

  return {
    ok: true,
    nextSelections,
    draftPatch,
    nextOrder: composed.nextOrder,
    nextDynamic: composed.nextDynamic as Record<string, DynamicSectionLike>,
    nextIntro: composed.nextIntro,
    nextActivitiesLines: composed.nextActivitiesLines,
    applyContent,
    avgConfidence: plan.avgConfidenceForAppliedContent,
    failures,
    skipped,
    fetchAttemptCount: keysToFetch.length,
    fetchSuccessCount: Math.max(0, keysToFetch.length - failures.length),
  };
}
