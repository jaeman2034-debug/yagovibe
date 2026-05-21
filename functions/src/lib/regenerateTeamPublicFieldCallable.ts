/**
 * 공개 카피 필드 단위 AI 재생성 → generated만 갱신, edited 해당 키는 삭제(새 AI가 바로 노출)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { getOpenAIClient, resolveOpenAIApiKey } from "./openaiClient";
import { AI_PROFILE_SCHEMA_VERSION, parseV2OrMigrate } from "./teamAiProfileV2";
import { assertTeamPublicPhotoManager } from "./assertTeamPublicPhotoManager";

const REGION = "asia-northeast3";

const ALLOWED = ["description", "highlights", "recruitMessage", "captainMessage"] as const;
type PublicField = (typeof ALLOWED)[number];

type BrandStyleId = "social" | "competitive" | "tournament" | "youth" | "corporate";
type MainActivityId = "weekend" | "weekday" | "league" | "casual";
type VibeId = "fun" | "balanced" | "serious";
type RecruitStyleId = "beginners" | "experienced" | "open";

type BrandingCtx = {
  teamName: string;
  region: string;
  sportType: string;
  brandStyle: BrandStyleId;
  mainActivity: MainActivityId;
  vibe: VibeId;
  recruitStyle: RecruitStyleId;
};

const BRAND_LABEL: Record<BrandStyleId, string> = {
  social: "친목·함께 즐기는 분위기",
  competitive: "실력 향상·성장 중심",
  tournament: "리그·대회 활동",
  youth: "유소년·교육 중심",
  corporate: "직장인 동호회",
};

const ACT_LABEL: Record<MainActivityId, string> = {
  weekend: "주말 위주 경기",
  weekday: "평일 저녁 등 운영",
  league: "정규 리그·대회 참가",
  casual: "부담 없는 친선·자유 매치",
};

const VIBE_LABEL: Record<VibeId, string> = {
  fun: "가볍게 즐기는",
  balanced: "적당한 긴장감의",
  serious: "승부·집중도가 높은",
};

const RECRUIT_LABEL: Record<RecruitStyleId, string> = {
  beginners: "처음 오시는 분도 환영",
  experienced: "경험 있는 선수 위주",
  open: "연령·실력 제한 없이 열려 있음",
};

function sportKo(sportType: string): string {
  const s = String(sportType || "").toLowerCase();
  const map: Record<string, string> = {
    soccer: "축구",
    football: "축구",
    baseball: "야구",
    basketball: "농구",
    volleyball: "배구",
    futsal: "풋살",
  };
  return map[s] || sportType || "스포츠";
}

function shortButtonCtaFromRecruit(recruit: string, fallback: string): string {
  const t = recruit.trim();
  if (!t) return fallback;
  const chars = Array.from(t);
  if (chars.length <= 12) return t;
  return `${chars.slice(0, 10).join("")}…`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Firestore update는 중첩 객체에 `undefined`가 있으면 실패할 수 있음 */
function omitUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (value instanceof FieldValue) return value;
  const ctor = (value as { constructor?: { name?: string } }).constructor?.name;
  if (ctor === "Timestamp" || ctor === "Date") return value;

  if (Array.isArray(value)) {
    return (value as unknown[])
      .map((x) => omitUndefinedDeep(x))
      .filter((x) => x !== undefined);
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    const next = omitUndefinedDeep(v);
    if (next !== undefined) out[k] = next;
  }
  return out;
}

function assertEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) {
    return v as T;
  }
  return fallback;
}

function readBrandingCtx(team: Record<string, unknown>): BrandingCtx {
  const { meta } = parseV2OrMigrate(team.aiProfile);
  const m = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
  const ob =
    m.onboarding && typeof m.onboarding === "object" && !Array.isArray(m.onboarding)
      ? (m.onboarding as Record<string, unknown>)
      : {};
  const sportType =
    typeof team.sportType === "string" && team.sportType.trim()
      ? team.sportType.trim()
      : typeof team.primarySport === "string" && team.primarySport.trim()
        ? team.primarySport.trim()
        : typeof team.sport === "string" && team.sport.trim()
          ? team.sport.trim()
          : "soccer";
  return {
    teamName: String(team.name ?? "").trim() || "팀",
    region: String(team.region ?? team.baseRegion ?? "").trim() || "한국",
    sportType,
    brandStyle: assertEnum(m.brandStyle, ["social", "competitive", "tournament", "youth", "corporate"], "social"),
    mainActivity: assertEnum(ob.mainActivity, ["weekend", "weekday", "league", "casual"], "weekend"),
    vibe: assertEnum(ob.vibe, ["fun", "balanced", "serious"], "balanced"),
    recruitStyle: assertEnum(ob.recruitStyle, ["beginners", "experienced", "open"], "open"),
  };
}

function templateDescription(ctx: BrandingCtx): string {
  const sp = sportKo(ctx.sportType);
  return [
    `${ctx.region}를 기반으로 활동하는 «${ctx.teamName}» 생활체육 클럽입니다.`,
    `${BRAND_LABEL[ctx.brandStyle]} 성향으로 ${ACT_LABEL[ctx.mainActivity]}를 지향해요.`,
    `${VIBE_LABEL[ctx.vibe]} 클럽 분위기를 중요하게 생각하며, 모집은 ${RECRUIT_LABEL[ctx.recruitStyle]}입니다.`,
    `${sp}를 함께 즐길 분을 기다리고 있어요.`,
  ].join(" ");
}

function templateHighlights(ctx: BrandingCtx): string[] {
  const sp = sportKo(ctx.sportType);
  return [
    `${ctx.region}에서 ${sp}를 꾸준히 즐기고 싶은 분`,
    `${BRAND_LABEL[ctx.brandStyle]}에 공감하는 분`,
    `${ACT_LABEL[ctx.mainActivity]}에 관심 있는 분`,
  ];
}

function templateCaptainMessage(ctx: BrandingCtx): string {
  const sp = sportKo(ctx.sportType);
  return [
    `«${ctx.teamName}» 생활체육 클럽 회장입니다.`,
    `${ctx.region}에서 ${sp}를 함께 즐기고 싶은 분을 환영해요.`,
    `문의나 방문이 편하신 시간에 연락 주시면 성심껏 안내드릴게요.`,
  ].join("\n\n");
}

function templateRecruit(ctx: BrandingCtx): { recruitMessage: string; publicCta: string } {
  const recruitMessage =
    ctx.recruitStyle === "beginners"
      ? "부담 없이 첫 발을 내디딜 준비가 되셨다면, 지금 클럽에 합류해 보세요."
      : "클럽 분위기와 일정이 맞는지 가볍게 문의해 주세요. 함께해요.";
  const publicCta = shortButtonCtaFromRecruit(
    recruitMessage,
    ctx.recruitStyle === "beginners" ? "첫 발 함께하기" : "합류 문의하기"
  );
  return { recruitMessage, publicCta };
}

async function openaiRegenerateField(
  field: PublicField,
  ctx: BrandingCtx,
  gen: Record<string, unknown>
): Promise<{
  description?: string;
  highlights?: string[];
  recruitMessage?: string;
  publicCta?: string;
  captainMessage?: string;
} | null> {
  if (!resolveOpenAIApiKey()) return null;
  const sp = sportKo(ctx.sportType);
  const userBase = `
클럽 이름: ${ctx.teamName}
지역: ${ctx.region}
종목: ${sp}
클럽 성격: ${BRAND_LABEL[ctx.brandStyle]}
주 활동: ${ACT_LABEL[ctx.mainActivity]}
분위기: ${VIBE_LABEL[ctx.vibe]}
모집 성향: ${RECRUIT_LABEL[ctx.recruitStyle]}
`.trim();

  let prompt = "";
  if (field === "description") {
    prompt = `한국어 생활체육 클럽 소개 전문가다. 아래 클럽 정보만 사실로 쓰고 허위·과장 금지.
${userBase}

참고(다른 필드는 바꾸지 말 것): 현재 슬로건 요약 — ${String(gen.slogan ?? "").slice(0, 80)}

[과제] 클럽 소개(description)만 새로 작성한다. 3~4문장, 문장 사이 줄바꿈은 \\n.

JSON만 출력: {"description": string}`;
  } else if (field === "highlights") {
    prompt = `한국어 생활체육 클럽 추천 문구 전문가다. 아래 클럽 정보만 사실로 쓰고 허위 금지.
${userBase}

[과제] "이런 분께 추천" 불릿 문자열 배열을 정확히 3개 생성한다. 각 한 줄, "- " 접두 금지, 52자 이내.

JSON만 출력: {"highlights": string[]}`;
  } else if (field === "recruitMessage") {
    prompt = `한국어 생활체육 클럽 CTA 카피라이터다. 아래 클럽 정보만 사실로 쓰고 허위·과장 금지.
${userBase}

[과제] 참여·합류 유도 문구(recruitMessage) 한두 문장(120자 이내) + 앱 버튼용 짧은 publicCta(12자 이내).

JSON만 출력: {"recruitMessage": string, "publicCta": string}`;
  } else {
    prompt = `한국어 생활체육 클럽 회장 인사 전문가다. 아래 클럽 정보만 사실로 쓰고 허위·과장·구체적 실적 주장 금지.
${userBase}

참고(다른 필드는 바꾸지 말 것): 기존 인사 초안 — ${String(gen.captainMessage ?? "").slice(0, 200)}

[과제] 공개 클럽 페이지에 올릴 회장 인사말(captainMessage 필드명 유지)만 새로 작성한다. 2~4문장, "저희"·"클럽" 등 자연스러운 어조, 방문자 환영·지역 커뮤니티·참여 독려. 프로·기업 광고체 금지. 문장 사이 줄바꿈은 \\n.

JSON만 출력: {"captainMessage": string}`;
  }

  const openai = getOpenAIClient();
  const aiResp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "한국어 JSON만 출력한다. 마크다운 코드펜스 금지.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.72,
    max_tokens: field === "description" ? 700 : field === "captainMessage" ? 450 : 400,
  });

  const raw = aiResp.choices[0]?.message?.content?.trim() || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (field === "description") {
    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    if (!description) return null;
    return { description };
  }
  if (field === "highlights") {
    const rawH = parsed.highlights ?? parsed.homeHighlights;
    const arr = Array.isArray(rawH)
      ? rawH.map((x) => String(x).trim().replace(/^[-•*]\s*/, "")).filter(Boolean).slice(0, 3)
      : [];
    while (arr.length < 3) {
      arr.push(`${ctx.region} · ${sp}`);
    }
    return { highlights: arr.slice(0, 3) };
  }
  if (field === "captainMessage") {
    const captainMessage = typeof parsed.captainMessage === "string" ? parsed.captainMessage.trim() : "";
    if (!captainMessage) return null;
    return { captainMessage };
  }
  const recruitMessage =
    typeof parsed.recruitMessage === "string" ? parsed.recruitMessage.trim() : "";
  const publicCtaRaw = typeof parsed.publicCta === "string" ? parsed.publicCta.trim() : "";
  if (!recruitMessage) return null;
  const publicCta = publicCtaRaw || shortButtonCtaFromRecruit(recruitMessage, "클럽 합류하기");
  return { recruitMessage, publicCta };
}

export const regenerateTeamPublicField = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  const fieldRaw = typeof d.field === "string" ? d.field.trim() : "";
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
  if (!ALLOWED.includes(fieldRaw as PublicField)) {
    throw new HttpsError(
      "invalid-argument",
      "field는 description | highlights | recruitMessage | captainMessage 중 하나여야 합니다."
    );
  }
  const field = fieldRaw as PublicField;

  const firestore = getFirestore();
  const teamRef = firestore.collection("teams").doc(teamId);
  const snap = await teamRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  const teamRaw = snap.data();
  if (!teamRaw || typeof teamRaw !== "object" || Array.isArray(teamRaw)) {
    throw new HttpsError("not-found", "팀 데이터를 읽을 수 없습니다.");
  }
  const team = teamRaw as Record<string, unknown>;
  const owner = String(team.ownerUid ?? team.ownerUserId ?? "");
  if (field === "captainMessage") {
    await assertTeamPublicPhotoManager(firestore, teamId, uid);
  } else if (owner !== uid) {
    throw new HttpsError("permission-denied", "팀 소유자만 AI 재생성을 할 수 있습니다.");
  }

  try {
    const { generated: genRaw, edited: editedRaw, meta: metaRaw } = parseV2OrMigrate(team.aiProfile);
    const gen: Record<string, unknown> =
      genRaw && typeof genRaw === "object" && !Array.isArray(genRaw) ? { ...(genRaw as Record<string, unknown>) } : {};

    const ctx = readBrandingCtx(team);

    let source: "openai" | "template" = "template";
    let patch: {
      description?: string;
      highlights?: string[];
      recruitMessage?: string;
      publicCta?: string;
      captainMessage?: string;
    } = {};

    try {
      const ai = await openaiRegenerateField(field, ctx, gen);
      if (ai && Object.keys(ai).length > 0) {
        patch = ai;
        source = "openai";
      }
    } catch (e) {
      logger.warn("[regenerateTeamPublicField] OpenAI 실패, 템플릿 사용", {
        msg: e instanceof Error ? e.message : String(e),
      });
    }

    if (Object.keys(patch).length === 0) {
      if (field === "description") {
        patch = { description: templateDescription(ctx) };
      } else if (field === "highlights") {
        patch = { highlights: templateHighlights(ctx) };
      } else if (field === "captainMessage") {
        patch = { captainMessage: templateCaptainMessage(ctx) };
      } else {
        patch = templateRecruit(ctx);
      }
      source = "template";
    }

    const edNext: Record<string, unknown> =
      editedRaw && typeof editedRaw === "object" && !Array.isArray(editedRaw)
        ? { ...(editedRaw as Record<string, unknown>) }
        : {};

    const mapKey = field === "highlights" ? "highlights" : field;
    delete edNext[mapKey];
    if (field === "highlights") {
      delete edNext.homeHighlights;
    }

    const genNext: Record<string, unknown> = { ...gen };

    if (field === "description") {
      const fromPatch = str(patch.description);
      const desc = fromPatch || templateDescription(ctx);
      if (source === "openai" && !fromPatch) source = "template";
      genNext.description = desc;
      genNext.intro = desc;
    } else if (field === "highlights") {
      let hl = Array.isArray(patch.highlights) && patch.highlights.length ? [...patch.highlights] : templateHighlights(ctx);
      hl = hl.map((x) => String(x).trim().replace(/^[-•*]\s*/, "")).filter(Boolean);
      const sp = sportKo(ctx.sportType);
      while (hl.length < 3) {
        hl.push(`${ctx.region} · ${sp}`);
      }
      genNext.highlights = hl.slice(0, 3);
    } else if (field === "captainMessage") {
      let cm = str(patch.captainMessage);
      if (!cm) {
        cm = templateCaptainMessage(ctx);
        source = "template";
      }
      genNext.captainMessage = cm;
    } else {
      let rm = str(patch.recruitMessage);
      let cta = str(patch.publicCta);
      if (!rm) {
        const fb = templateRecruit(ctx);
        rm = fb.recruitMessage;
        cta = fb.publicCta;
        source = "template";
      }
      genNext.recruitMessage = rm;
      genNext.publicCta = cta || shortButtonCtaFromRecruit(rm, "클럽 합류하기");
    }

    const effectiveDescription =
      Object.prototype.hasOwnProperty.call(edNext, "description") && typeof edNext.description === "string"
        ? edNext.description.trim()
        : str(genNext.description) || templateDescription(ctx);

    const metaBag =
      metaRaw && typeof metaRaw === "object" && !Array.isArray(metaRaw) ? { ...(metaRaw as Record<string, unknown>) } : {};

    const aiProfileRaw: Record<string, unknown> = {
      schemaVersion: AI_PROFILE_SCHEMA_VERSION,
      generated: genNext,
      edited: edNext,
      meta: {
        ...metaBag,
        lastAiFieldRegeneratedAt: FieldValue.serverTimestamp(),
        lastPartialRegenerateSource: source,
      },
    };

    const aiProfile = omitUndefinedDeep(aiProfileRaw) as Record<string, unknown>;

    await teamRef.update({
      aiProfile,
      description: effectiveDescription,
      updatedAt: FieldValue.serverTimestamp(),
    });
    logger.info("[regenerateTeamPublicField] ok", { teamId, field, source });
    return { ok: true, field, source };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[regenerateTeamPublicField] unexpected", { teamId, field, msg, stack: e instanceof Error ? e.stack : undefined });
    throw new HttpsError("internal", `공개 필드 재생성 저장에 실패했습니다: ${msg}`);
  }
});
