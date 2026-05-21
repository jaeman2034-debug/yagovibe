import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getOpenAIClient, resolveOpenAIApiKey } from "../lib/openaiClient";
import {
  buildRuleBasedPackage,
  clampConfidence,
  normalizeVariantsArray,
  type AssociationContext,
  type ImageContentPackageWire,
} from "../types/imageContentPackage";
import type { PlacementHeuristicAdjustment } from "./aiPlacementScoring";
import { loadPlacementHeuristicAdjustment } from "./aiPlacementFeedback";
import { applyPlacementHeuristicToVariants } from "./imageContentHeuristics";

function packageWithHeuristic(
  pkg: ImageContentPackageWire,
  adj?: PlacementHeuristicAdjustment
): ImageContentPackageWire {
  const reason = applyPlacementHeuristicToVariants(pkg.variants, adj);
  if (reason) pkg.placementReason = reason;
  return pkg;
}

function buildVariationTierInstruction(regenerateCount: number): string {
  if (regenerateCount <= 0) {
    return "- 재생성 카운트 0: 기본 다양화만.";
  }
  if (regenerateCount === 1) {
    return (
      "- 1차 재생성: official / community / marketing 톤 대비를 극대화. 어휘·제목 패턴·문장 종결을 이전 생성과 겹치지 않게."
    );
  }
  if (regenerateCount === 2) {
    return (
      "- 2차 재생성: 문장 호흡 변경(짧은 절 / 한 문장 강조). 세 후보마다 서로 다른 리듬."
    );
  }
  return (
    "- 3차 이상 재생성: 구성 재편(나열형·한 줄 임팩트·간결 스토리). marketing 톤 후보만 부드러운 참여 유도 한 문장 허용(과장·허위·확정 불가 사실 금지)."
  );
}

type RequestContext = {
  federationName?: string;
  sport?: string;
  region?: string;
  associationName?: string;
  sportType?: string;
};

type RequestData = {
  imageUrl: string;
  federationSlug?: string;
  /** 클라이언트 스토리지 키·섹션 키 등 추적용 */
  imageId?: string;
  context?: RequestContext;
  /** 같은 이미지에서 「다시 생성」 횟수 (1~). 0이면 초기 생성 */
  regenerateCount?: number;
  /** 클라이언트 타임스탬프 등 — 프롬프트 분기·temperature 지터 */
  variationSeed?: number;
  forceRegenerate?: boolean;
};

function mergeAssociationContext(ctx: RequestContext | undefined): AssociationContext {
  const c = ctx || {};
  return {
    associationName:
      String(c.associationName || c.federationName || "").trim() || undefined,
    sportType: String(c.sportType || c.sport || "").trim() || undefined,
    region: String(c.region || "").trim() || undefined,
  };
}

function stableImageId(imageUrl: string, slug: string, provided?: string): string {
  const p = String(provided || "").trim();
  if (p) return p.slice(0, 200);
  let h = 0;
  for (let i = 0; i < imageUrl.length; i++) h = (h * 31 + imageUrl.charCodeAt(i)) >>> 0;
  return `img_${slug || "fed"}_${h.toString(16).slice(0, 12)}`;
}

const JSON_SHAPE = `반드시 아래 형태의 JSON만 출력 (설명·마크다운 금지):
{
  "variants": [
    {
      "tone": "official",
      "title": "최대 80자 제목",
      "summary": "최대 120자 한 줄 요약",
      "content": "1~3문장 본문",
      "tags": ["태그1","태그2","태그3"],
      "recommendedUse": "intro_section",
      "confidence": 0.92
    },
    {
      "tone": "community",
      "title": "...",
      "summary": "...",
      "content": "...",
      "tags": ["..."],
      "recommendedUse": "activity_section",
      "confidence": 0.88
    },
    {
      "tone": "marketing",
      "title": "...",
      "summary": "...",
      "content": "...",
      "tags": ["..."],
      "recommendedUse": "general_post",
      "confidence": 0.85
    }
  ],
  "bestVariantIndex": 0
}

규칙:
- variants는 정확히 3개, tone은 official / community / marketing 각 1회
- recommendedUse는 hero_banner | intro_section | activity_section | market_post | general_post 중 하나
- MVP 권장: official→intro_section, community→activity_section, marketing→general_post
- recommendedUse는 이미지 유형에 맞게 채우되, 서버가 장면 휴리스틱으로 최종 배치를 보정할 수 있음
- tags는 2~5개, 짧은 명사
- confidence는 0~1 실수
- 이미지에서 유추 가능한 범위만 서술, 인원 수·행사명·수상 등 확정 불가 정보는 쓰지 말 것
- associationName·sportType·region이 주어지면 제목·본문에 자연스럽게 반영`;

/**
 * 이미지 + 맥락 → 구조화 콘텐츠 패키지 (variants[3]). Firestore 저장은 클라이언트/별도 API.
 */
export async function handleGenerateFederationImageContentPackage(req: {
  data: RequestData;
  auth?: { uid?: string };
}): Promise<ImageContentPackageWire> {
  if (!req.auth?.uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const imageUrl = String(req.data?.imageUrl || "").trim();
  if (!imageUrl) {
    throw new HttpsError("invalid-argument", "imageUrl이 필요합니다.");
  }
  if (!/^https:\/\//i.test(imageUrl)) {
    throw new HttpsError(
      "invalid-argument",
      "공개 HTTPS 이미지 URL만 지원합니다. (스토리지에 업로드된 주소를 사용해 주세요.)"
    );
  }
  if (imageUrl.length > 4096) {
    throw new HttpsError("invalid-argument", "imageUrl이 너무 깁니다.");
  }

  const slug = String(req.data?.federationSlug || "").trim();
  const imageId = stableImageId(imageUrl, slug, req.data?.imageId);
  const associationContext = mergeAssociationContext(req.data?.context);

  let placementAdj: PlacementHeuristicAdjustment | undefined;
  if (slug) {
    try {
      placementAdj = await loadPlacementHeuristicAdjustment(slug, 7);
    } catch (e: unknown) {
      logger.warn(
        "[generateFederationImageContentPackage] placement bias load skipped",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  let regenerateCount = Math.max(0, Math.min(100, Math.floor(Number(req.data?.regenerateCount) || 0)));
  const variationSeed = Number(req.data?.variationSeed);
  const forceRegenerate = req.data?.forceRegenerate === true;
  if (forceRegenerate && regenerateCount === 0) {
    regenerateCount = 1;
  }
  const hasVariation =
    regenerateCount > 0 ||
    (Number.isFinite(variationSeed) && variationSeed !== 0) ||
    forceRegenerate;

  const apiKey = resolveOpenAIApiKey();
  if (!apiKey) {
    logger.warn("[generateFederationImageContentPackage] no API key, rule fallback");
    return packageWithHeuristic(
      buildRuleBasedPackage({ imageId, federationSlug: slug, associationContext }),
      placementAdj
    );
  }

  const contextBlock = [
    associationContext.associationName && `협회명: ${associationContext.associationName}`,
    associationContext.sportType && `종목: ${associationContext.sportType}`,
    associationContext.region && `지역: ${associationContext.region}`,
    slug && `슬러그: ${slug}`,
  ]
    .filter(Boolean)
    .join("\n");

  let userText =
    "너는 스포츠 협회·커뮤니티용 콘텐츠 생성기다. 아래 이미지와 맥락을 보고 사용자가 선택할 수 있는 3개 후보를 한국어로 만든다.\n\n" +
    `맥락:\n${contextBlock || "(맥락 없음)"}\n\n` +
    JSON_SHAPE;

  if (hasVariation) {
    userText +=
      "\n\n[재생성·표현 다양화 — 필수]\n" +
      "- 이전에 같은 이미지로 생성된 초안이 있었을 수 있다. 문장 시작·제목 구조·어휘·비유를 바꿔 이전과 겹치지 않게 쓸 것.\n" +
      "- 세 톤(official / community / marketing)의 대비를 이전보다 더 선명하게 유지할 것.\n" +
      `${buildVariationTierInstruction(regenerateCount)}\n` +
      `- variationSeed: ${Number.isFinite(variationSeed) ? String(Math.floor(variationSeed)) : "없음"}\n` +
      `- regenerateCount: ${regenerateCount} (값이 클수록 문장 길이·톤·어순 변주를 더 과감하게)\n`;
  }

  const openai = getOpenAIClient();

  const baseTemp = 0.4;
  const jitter = Number.isFinite(variationSeed)
    ? (Math.abs(Math.floor(variationSeed)) % 19) / 200
    : 0;
  let temperature = baseTemp;
  if (regenerateCount > 0) {
    temperature = Math.min(0.95, 0.4 + regenerateCount * 0.07 + jitter);
  } else if (forceRegenerate || (Number.isFinite(variationSeed) && variationSeed !== 0)) {
    temperature = Math.min(0.9, 0.52 + jitter);
  }

  logger.info("[generateFederationImageContentPackage] request", {
    uid: req.auth.uid,
    imageId,
    hasContext: !!contextBlock,
    regenerateCount,
    variationSeed: Number.isFinite(variationSeed) ? variationSeed : null,
    forceRegenerate,
    temperature,
    urlHost: (() => {
      try {
        return new URL(imageUrl).hostname;
      } catch {
        return "invalid-url";
      }
    })(),
  });

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature,
      ...(hasVariation ? { top_p: 0.94 } : {}),
      max_tokens: hasVariation ? 2000 : 1800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        },
      ],
    });

    const raw = String(res.choices[0]?.message?.content || "").trim();
    if (!raw) {
      return packageWithHeuristic(
        buildRuleBasedPackage({ imageId, federationSlug: slug, associationContext }),
        placementAdj
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return packageWithHeuristic(
        buildRuleBasedPackage({ imageId, federationSlug: slug, associationContext }),
        placementAdj
      );
    }

    const normalized = normalizeVariantsArray(parsed.variants);
    if (!normalized) {
      return packageWithHeuristic(
        buildRuleBasedPackage({ imageId, federationSlug: slug, associationContext }),
        placementAdj
      );
    }

    let best = Number(parsed.bestVariantIndex);
    if (!Number.isFinite(best) || best < 0 || best > 2) best = 0;
    best = Math.floor(best);

    for (let i = 0; i < 3; i++) {
      normalized[i].confidence = clampConfidence(normalized[i].confidence);
    }

    const placementReason = applyPlacementHeuristicToVariants(normalized, placementAdj);

    return {
      ok: true,
      imageId,
      federationSlug: slug || undefined,
      associationContext,
      variants: normalized,
      bestVariantIndex: best,
      createdAt: new Date().toISOString(),
      usedFallback: false,
      ...(placementReason ? { placementReason } : {}),
    };
  } catch (e: unknown) {
    logger.warn("[generateFederationImageContentPackage] LLM error, rule fallback", String(e));
    return packageWithHeuristic(
      buildRuleBasedPackage({ imageId, federationSlug: slug, associationContext }),
      placementAdj
    );
  }
}
