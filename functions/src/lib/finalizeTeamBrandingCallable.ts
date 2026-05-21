/**
 * 팀 생성 직후 공개 프로필용 브랜딩 문구 생성 → teams.aiProfile(v2: generated/edited/meta) + description
 * Firestore teams 문서는 클라이언트 쓰기 불가 → Admin만 갱신
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { getOpenAIClient, resolveOpenAIApiKey } from "./openaiClient";
import { AI_PROFILE_SCHEMA_VERSION, parseV2OrMigrate } from "./teamAiProfileV2";

const REGION = "asia-northeast3";

type BrandStyleId = "social" | "competitive" | "tournament" | "youth" | "corporate";
type MainActivityId = "weekend" | "weekday" | "league" | "casual";
type VibeId = "fun" | "balanced" | "serious";
type RecruitStyleId = "beginners" | "experienced" | "open";

type FinalizeInput = {
  teamId: string;
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

type BrandingPack = {
  /** 팀 소개 본문 (3~4문장 분위기, Public description과 동일 소스) */
  description: string;
  slogan: string;
  publicCta: string;
  /** 합류·참여 유도 한 문장 (버튼 라벨보다 길어도 됨) */
  recruitMessage: string;
  /** "이런 분께 추천" 스타일 불릿 2~3개 */
  homeHighlights: string[];
  themePreset: "light" | "dark";
  /** 운영진 1인칭 인사·신뢰 브랜딩 (공개 카드용, AI 초안은 generated.captainMessage) */
  captainMessage: string;
};

/** 버튼용 짧은 CTA — recruitMessage가 길 때만 잘라 쓴다 */
function shortButtonCtaFromRecruit(recruit: string, fallback: string): string {
  const t = recruit.trim();
  if (!t) return fallback;
  const chars = Array.from(t);
  if (chars.length <= 12) return t;
  return `${chars.slice(0, 10).join("")}…`;
}

function buildTemplate(input: FinalizeInput & { teamName: string; region: string }): BrandingPack {
  const sp = sportKo(input.sportType);
  const description = [
    `${input.region}를 기반으로 활동하는 «${input.teamName}» 생활체육 클럽입니다.`,
    `${BRAND_LABEL[input.brandStyle]} 성향으로 ${ACT_LABEL[input.mainActivity]}를 지향해요.`,
    `${VIBE_LABEL[input.vibe]} 클럽 분위기를 중요하게 생각하며, 모집은 ${RECRUIT_LABEL[input.recruitStyle]}입니다.`,
    `${sp}를 함께 즐길 분을 기다리고 있어요.`,
  ].join(" ");
  const slogan =
    input.brandStyle === "competitive"
      ? "오늘 한 걸음, 내일 한 승"
      : input.brandStyle === "tournament"
        ? "경기장에서 증명하는 팀"
        : input.brandStyle === "youth"
          ? "함께 크는 팀"
          : input.brandStyle === "corporate"
            ? "일과 운동, 둘 다 챙기는 팀"
            : `${sp} 동료가 되어 함께해요`;
  const recruitMessage =
    input.recruitStyle === "beginners"
      ? "부담 없이 첫 발을 내디딜 준비가 되셨다면, 지금 클럽에 합류해 보세요."
      : "클럽 분위기와 일정이 맞는지 가볍게 문의해 주세요. 함께해요.";
  const publicCta = shortButtonCtaFromRecruit(
    recruitMessage,
    input.recruitStyle === "beginners" ? "첫 발 함께하기" : "합류 문의하기"
  );
  const homeHighlights = [
    `${input.region}에서 ${sp}를 꾸준히 즐기고 싶은 분`,
    `${BRAND_LABEL[input.brandStyle]}에 공감하는 분`,
    `${ACT_LABEL[input.mainActivity]}에 관심 있는 분`,
  ];
  const themePreset: "light" | "dark" =
    input.brandStyle === "competitive" || input.vibe === "serious" ? "dark" : "light";
  const captainMessage = [
    `안녕하세요. «${input.teamName}» 생활체육 클럽 회장입니다.`,
    `${input.region}에서 ${sp}를 ${ACT_LABEL[input.mainActivity]}로 즐기고 있어요. ${BRAND_LABEL[input.brandStyle]} 분위기를 지향합니다.`,
    `${VIBE_LABEL[input.vibe]} 클럽 문화 속에서 ${RECRUIT_LABEL[input.recruitStyle]} 모집을 하고 있어요.`,
    "궁금한 점은 편하게 문의 주시면 성심껏 안내드릴게요. 함께해 주셔서 감사합니다.",
  ].join("\n\n");
  return { description, slogan, publicCta, recruitMessage, homeHighlights, themePreset, captainMessage };
}

async function buildWithOpenAI(
  input: FinalizeInput & { teamName: string; region: string }
): Promise<BrandingPack | null> {
  const openai = getOpenAIClient();
  const sp = sportKo(input.sportType);
  const activity = ACT_LABEL[input.mainActivity];
  const tone = VIBE_LABEL[input.vibe];

  const userBlock = `
[입력]
- 클럽 이름: ${input.teamName}
- 지역: ${input.region}
- 종목: ${sp}
- 팀 스타일(브랜드): ${BRAND_LABEL[input.brandStyle]}
- 주 활동(일정·성격): ${activity}
- 분위기(톤): ${tone}
- 모집 성향: ${RECRUIT_LABEL[input.recruitStyle]}
`.trim();

  const prompt = `너는 한국 생활체육 동호회·클럽 브랜딩 전문가다.
아래 [입력]만 사실로 취급하고, 없는 전적·수상·리그명·구체 일정은 만들지 마라.
과장 광고체는 피하고, 실제 클럽처럼 자연스럽고 따뜻하게 써라.
읽었을 때 "가입하고 싶다"는 느낌이 나도록 구체적이되 허위는 금지다.

[요구사항]
1. slogan: 한 문장, 짧고 임팩트 있게 (28자 이내 권장)
2. description: 클럽 소개 3~4문장. 문장마다 줄바꿈(\\n)으로 구분해 가독성을 높여라. 친근한 존댓말·반말 혼용은 자연스러우면 허용.
3. highlights: "이런 분께 추천"에 쓸 불릿 문자열 배열, 정확히 3개. 각 항목은 한 줄(불필요한 "- " 접두 금지, 52자 이내).
4. recruitMessage: 참여·합류를 유도하는 한두 문장 CTA (허위 약속 금지, 120자 이내 권장).
5. publicCta: 앱 버튼에 들어갈 아주 짧은 문구 (12자 이내). recruitMessage와 중복돼도 되나 더 짧아야 한다. 없으면 빈 문자열로 두어도 된다(서버에서 보정).
6. themePreset: "light" 또는 "dark" (실력·진지함·대회 위주면 dark 권장)
7. captainMessage: 생활체육 클럽 회장이 직접 말하는 듯한 1인칭 인사말 3~5문단. 줄바꿈(\\n\\n)으로 문단 구분. 전적·수상·구체 리그명은 쓰지 말 것. 클럽 스타일·주 활동·분위기·모집 성향을 자연스럽게 녹일 것. 환영·지역 커뮤니티·참여 독려 톤. 프로·기업 광고체 금지. 420자 이내 권장.

[출력 형식]
오직 JSON 객체 하나만. 다른 텍스트 금지.
키 이름과 타입:
{
  "slogan": string,
  "description": string,
  "recruitMessage": string,
  "highlights": string[],
  "publicCta"?: string,
  "themePreset": "light" | "dark",
  "captainMessage": string
}

과거 호환: description 대신 intro, highlights 대신 homeHighlights를 쓴 경우 그 값을 description·highlights로 간주해도 된다(동일 의미).

${userBlock}`;

  const aiResp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "당신은 한국어 생활체육 클럽 브랜딩 카피라이터다. 지시된 JSON 스키마만 출력한다. 마크다운 코드펜스는 쓰지 않는다.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.72,
    max_tokens: 1100,
  });

  const raw = aiResp.choices[0]?.message?.content?.trim() || "{}";
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const descriptionFromIntro =
    typeof parsed.intro === "string" && parsed.intro.trim() ? parsed.intro.trim() : "";
  const description =
    (typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim()
      : descriptionFromIntro) || "";
  const slogan = typeof parsed.slogan === "string" ? parsed.slogan.trim() : "";

  const recruitRaw =
    typeof parsed.recruitMessage === "string" && parsed.recruitMessage.trim()
      ? parsed.recruitMessage.trim()
      : "";
  const publicCtaRaw =
    typeof parsed.publicCta === "string" && parsed.publicCta.trim()
      ? parsed.publicCta.trim()
      : "";

  const highlightsFromLegacy = parsed.homeHighlights;
  const highlightsNew = parsed.highlights;
  const highlightsRaw = Array.isArray(highlightsNew)
    ? highlightsNew
    : Array.isArray(highlightsFromLegacy)
      ? highlightsFromLegacy
      : [];
  const homeHighlights = highlightsRaw
    .map((x) => String(x).trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .slice(0, 3);

  const themePreset: "light" | "dark" =
    parsed.themePreset === "dark" || parsed.themePreset === "light"
      ? (parsed.themePreset as "light" | "dark")
      : "light";

  if (!description || !slogan) {
    return null;
  }

  const recruitMessage =
    recruitRaw ||
    (publicCtaRaw
      ? `${publicCtaRaw} 팀 일정과 분위기가 궁금하시면 편하게 신청해 주세요.`
      : `${input.teamName}와 함께 ${sp}를 즐겨 보세요. 합류를 기다립니다.`);

  const publicCta = shortButtonCtaFromRecruit(
    publicCtaRaw || recruitMessage,
    "클럽 합류하기"
  );

  while (homeHighlights.length < 3) {
    homeHighlights.push(`${input.region}에서 ${sp}를 즐기고 싶은 분`);
  }

  let captainMessage = typeof parsed.captainMessage === "string" ? parsed.captainMessage.trim() : "";
  if (captainMessage.length > 1200) captainMessage = captainMessage.slice(0, 1200);
  if (!captainMessage) {
    captainMessage = buildTemplate(input).captainMessage;
  }

  return {
    description,
    slogan,
    publicCta,
    recruitMessage,
    homeHighlights: homeHighlights.slice(0, 3),
    themePreset,
    captainMessage,
  };
}

function assertEnum<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) {
    return v as T;
  }
  throw new HttpsError("invalid-argument", `${field} 값이 올바르지 않습니다.`);
}

export const finalizeTeamBranding = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");

  const sportType = typeof d.sportType === "string" ? d.sportType.trim() : "soccer";
  const brandStyle = assertEnum(
    d.brandStyle,
    ["social", "competitive", "tournament", "youth", "corporate"] as const,
    "brandStyle"
  );
  const mainActivity = assertEnum(
    d.mainActivity,
    ["weekend", "weekday", "league", "casual"] as const,
    "mainActivity"
  );
  const vibe = assertEnum(d.vibe, ["fun", "balanced", "serious"] as const, "vibe");
  const recruitStyle = assertEnum(
    d.recruitStyle,
    ["beginners", "experienced", "open"] as const,
    "recruitStyle"
  );

  const firestore = getFirestore();
  const teamRef = firestore.collection("teams").doc(teamId);
  const snap = await teamRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  const team = snap.data() as Record<string, unknown>;
  const owner = String(team.ownerUid ?? team.ownerUserId ?? "");
  if (owner !== uid) {
    throw new HttpsError("permission-denied", "팀 소유자만 브랜딩을 적용할 수 있습니다.");
  }

  const teamName = String(team.name ?? "").trim() || "팀";
  const region = String(team.region ?? team.baseRegion ?? "").trim() || "한국";

  const input: FinalizeInput & { teamName: string; region: string } = {
    teamId,
    sportType,
    brandStyle,
    mainActivity,
    vibe,
    recruitStyle,
    teamName,
    region,
  };

  let source: "openai" | "template" = "template";
  let pack = buildTemplate(input);

  if (resolveOpenAIApiKey()) {
    try {
      const ai = await buildWithOpenAI(input);
      if (ai) {
        pack = ai;
        source = "openai";
      }
    } catch (e) {
      logger.warn("[finalizeTeamBranding] OpenAI 실패, 템플릿 사용", {
        msg: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const forceRegenerate = d.forceRegenerate === true;
  const aiSkipped = forceRegenerate ? false : d.aiSkipped === true;
  const playStyleLabel = BRAND_LABEL[brandStyle];

  const { edited: prevEditedBag, meta: prevMetaBag } = parseV2OrMigrate(team.aiProfile);
  const prevIsFirst =
    typeof prevMetaBag.isFirstGenerated === "boolean" ? (prevMetaBag.isFirstGenerated as boolean) : undefined;
  const hadProfile = Boolean(team.aiProfile && typeof team.aiProfile === "object");
  /** 재생성: 이미 프로필이 있었으면 최초 플래그 해제. 없던 팀에 첫 생성이면 true 유지 */
  const isFirstGenerated = forceRegenerate
    ? hadProfile
      ? false
      : true
    : prevIsFirst === undefined
      ? true
      : prevIsFirst;

  /** Firestore·클라이언트에서 undefined 방지 */
  const safeStr = (v: unknown, fallback: string): string => {
    if (typeof v === "string" && v.trim()) return v.trim();
    return fallback;
  };
  const descriptionSafe = safeStr(
    pack.description,
    `${region}에서 활동하는 «${teamName}» 팀입니다.`
  );
  const sloganSafe = safeStr(pack.slogan, `${teamName}과 함께해요`);
  const publicCtaSafe = safeStr(pack.publicCta, "클럽 합류하기");
  const recruitMessageSafe = safeStr(pack.recruitMessage, publicCtaSafe);
  const playStyleSafe = safeStr(playStyleLabel, "스포츠 동호회");
  const captainMessageSafe = safeStr(
    pack.captainMessage,
    [
      `안녕하세요. «${teamName}» 운영진입니다.`,
      `${region}에서 ${sportKo(sportType)}를 함께 즐기고 있어요.`,
      "문의 주시면 자세히 안내드릴게요.",
    ].join("\n\n")
  );
  const highlightsRaw = Array.isArray(pack.homeHighlights) ? pack.homeHighlights : [];
  const homeHighlightsSafe = highlightsRaw
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);
  while (homeHighlightsSafe.length < 3) {
    homeHighlightsSafe.push(`${region} · ${sportKo(sportType)}`);
  }

  const editedNext = forceRegenerate ? {} : { ...prevEditedBag };

  const generated = {
    description: descriptionSafe,
    intro: descriptionSafe,
    highlights: homeHighlightsSafe.slice(0, 3),
    recruitMessage: recruitMessageSafe,
    publicCta: publicCtaSafe,
    slogan: sloganSafe,
    playStyle: playStyleSafe,
    themePreset: pack.themePreset,
    captainMessage: captainMessageSafe,
  };

  const meta: Record<string, unknown> = {
    ...prevMetaBag,
    brandStyle,
    onboarding: { mainActivity, vibe, recruitStyle },
    source,
    aiSkipped,
    isFirstGenerated,
    generatedAt: FieldValue.serverTimestamp(),
  };
  if (forceRegenerate) {
    meta.lastRegeneratedAt = FieldValue.serverTimestamp();
  }

  const aiProfile: Record<string, unknown> = {
    schemaVersion: AI_PROFILE_SCHEMA_VERSION,
    generated,
    edited: editedNext,
    meta,
  };

  const prevDesc = typeof team.description === "string" ? team.description.trim() : "";
  const update: Record<string, unknown> = {
    aiProfile,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (forceRegenerate || !prevDesc) {
    update.description = descriptionSafe;
  }

  await teamRef.update(update);

  logger.info("[finalizeTeamBranding] ok", { teamId, source, forceRegenerate });
  return { ok: true, source, forceRegenerate };
});
