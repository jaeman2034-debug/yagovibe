/**
 * 팀 공개 카피 textarea — 선택 구간만 AI로 다듬기 (전체 재생성과 분리)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { getOpenAIClient, resolveOpenAIApiKey } from "./openaiClient";
import { parseV2OrMigrate } from "./teamAiProfileV2";

const REGION = "asia-northeast3";

const FIELDS = ["intro", "oneLine", "joinMessage"] as const;
type SelectionField = (typeof FIELDS)[number];

const IMPROVEMENT_STYLES = ["natural", "recruiting", "short", "serious"] as const;
type ImprovementStyle = (typeof IMPROVEMENT_STYLES)[number];

const STYLE_INSTRUCTION: Record<ImprovementStyle, string> = {
  natural: "문장을 한국어로 자연스럽고 읽기 좋게 다듬는다. 의미·사실은 그대로 유지한다.",
  recruiting: "모집·참여가 더 느껴지도록 적극적이되, 허위·과장은 넣지 않는다.",
  short: "의미는 유지한 채 더 짧고 임팩트 있게 줄인다.",
  serious: "차분하고 진지한 동호회 톤으로 격식 있게 다듬는다.",
};

const MAX_SELECTION = 400;

function assertEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) {
    return v as T;
  }
  return fallback;
}

type VibeId = "fun" | "balanced" | "serious";
const VIBE_LABEL: Record<VibeId, string> = {
  fun: "가볍게 즐기는",
  balanced: "적당한 긴장감의",
  serious: "승부·집중도가 높은",
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

function readToneLine(team: Record<string, unknown>, toneOverride?: string): string {
  const raw = typeof toneOverride === "string" ? toneOverride.trim() : "";
  if (raw && (["fun", "balanced", "serious"] as const).includes(raw as VibeId)) {
    return VIBE_LABEL[raw as VibeId];
  }
  if (raw) {
    return raw.slice(0, 120);
  }
  const { meta } = parseV2OrMigrate(team.aiProfile);
  const m = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
  const ob =
    m.onboarding && typeof m.onboarding === "object" && !Array.isArray(m.onboarding)
      ? (m.onboarding as Record<string, unknown>)
      : {};
  const vibe = assertEnum(ob.vibe, ["fun", "balanced", "serious"], "balanced");
  return VIBE_LABEL[vibe];
}

function maxFullLen(field: SelectionField): number {
  if (field === "intro") return 8000;
  if (field === "joinMessage") return 600;
  return 4000;
}

function maxImprovedLen(field: SelectionField, selLen: number): number {
  if (field === "intro") return Math.min(2000, Math.max(selLen + 400, 320));
  if (field === "joinMessage") return Math.min(600, Math.max(selLen + 200, 120));
  return Math.min(280, Math.max(selLen + 120, 80));
}

function templateImprove(selected: string, style: ImprovementStyle): string {
  let t = selected.trim().replace(/\s+/g, " ");
  if (!t) return selected;
  const cap = style === "short" ? 120 : 280;
  return t.length > cap ? `${t.slice(0, cap - 1)}…` : t;
}

async function openaiImproveSelection(args: {
  field: SelectionField;
  style: ImprovementStyle;
  teamName: string;
  region: string;
  sportLabel: string;
  toneLine: string;
  fullText: string;
  selected: string;
}): Promise<string | null> {
  if (!resolveOpenAIApiKey()) return null;
  const fieldHint =
    args.field === "intro"
      ? "팀 소개 문단의 일부"
      : args.field === "oneLine"
        ? "‘이런 분께 추천’ 한 줄 항목의 일부"
        : "참여·합류를 유도하는 문구의 일부";

  const contextSnippet = args.fullText.length > 900 ? `${args.fullText.slice(0, 900)}…` : args.fullText;

  const prompt = `한국어 스포츠 동호회 팀 카피 에디터다. 아래 [선택 구간]만 다듬는다. 전체 글을 다시 쓰지 않는다. 허위 정보를 추가하지 않는다.

팀: ${args.teamName}
지역: ${args.region}
종목: ${args.sportLabel}
톤: ${args.toneLine}
필드: ${fieldHint}
개선 스타일: ${STYLE_INSTRUCTION[args.style]}

[전체 맥락 — 참고만, 출력 금지]
${contextSnippet}

[선택 구간 — 이 문장/구절만 개선해 한국어로 출력]
${args.selected}

규칙:
- 위 개선 스타일을 반드시 반영한다.
- ${args.field === "joinMessage" ? "간결하고 행동을 유도하는 톤에 맞춘다." : args.field === "oneLine" ? "한 줄로 읽히게, 과장 없이 다듬는다." : "문장 호흡을 다듬되 정보 추가 금지."}
- JSON만 출력: {"improvedText": string}`;

  const openai = getOpenAIClient();
  const aiResp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "한국어 JSON만 출력한다. 마크다운 코드펜스 금지." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: args.style === "recruiting" ? 0.62 : args.style === "short" ? 0.48 : 0.55,
    max_tokens: 450,
  });

  const raw = aiResp.choices[0]?.message?.content?.trim() || "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  const improved = typeof parsed.improvedText === "string" ? parsed.improvedText.trim() : "";
  return improved || null;
}

export const improveTeamPublicTextSelection = onCall({ region: REGION, maxInstances: 15 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const d = request.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }

  const teamId = typeof d.teamId === "string" ? d.teamId.trim() : "";
  const fieldRaw = typeof d.field === "string" ? d.field.trim() : "";
  const fullText = typeof d.fullText === "string" ? d.fullText : "";
  const tone = typeof d.tone === "string" ? d.tone.trim() || undefined : undefined;
  const styleRaw = typeof d.style === "string" ? d.style.trim() : "";
  const style: ImprovementStyle = assertEnum(styleRaw, IMPROVEMENT_STYLES, "natural");

  const selectionStart = typeof d.selectionStart === "number" ? d.selectionStart : Number.NaN;
  const selectionEnd = typeof d.selectionEnd === "number" ? d.selectionEnd : Number.NaN;

  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
  if (!FIELDS.includes(fieldRaw as SelectionField)) {
    throw new HttpsError("invalid-argument", "field는 intro | oneLine | joinMessage 중 하나여야 합니다.");
  }
  const field = fieldRaw as SelectionField;

  const maxFull = maxFullLen(field);
  if (fullText.length > maxFull) {
    throw new HttpsError("invalid-argument", "본문 길이가 허용 범위를 넘었습니다.");
  }

  if (!Number.isFinite(selectionStart) || !Number.isFinite(selectionEnd)) {
    throw new HttpsError("invalid-argument", "selectionStart, selectionEnd가 필요합니다.");
  }
  const start = Math.floor(selectionStart);
  const end = Math.floor(selectionEnd);
  if (start < 0 || end > fullText.length || start >= end) {
    throw new HttpsError("invalid-argument", "선택 범위가 올바르지 않습니다.");
  }
  if (end - start > MAX_SELECTION) {
    throw new HttpsError("invalid-argument", `선택은 ${MAX_SELECTION}자 이내여야 합니다.`);
  }

  const selected = fullText.slice(start, end);
  if (!selected.trim()) {
    throw new HttpsError("invalid-argument", "선택된 텍스트가 비어 있습니다.");
  }

  const fallbackTemplate = (): { improvedText: string; source: "template" } => ({
    improvedText: templateImprove(selected, style) || selected,
    source: "template",
  });

  try {
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
    if (owner !== uid) {
      throw new HttpsError("permission-denied", "팀 소유자만 AI 개선을 사용할 수 있습니다.");
    }

    const teamName = String(team.name ?? "").trim() || "팀";
    const region = String(team.region ?? team.baseRegion ?? "").trim() || "한국";
    const sportType =
      typeof team.sportType === "string" && team.sportType.trim()
        ? team.sportType.trim()
        : typeof team.primarySport === "string" && team.primarySport.trim()
          ? team.primarySport.trim()
          : typeof team.sport === "string" && team.sport.trim()
            ? team.sport.trim()
            : "soccer";

    let source: "openai" | "template" = "template";
    let improved = templateImprove(selected, style);

    try {
      const ai = await openaiImproveSelection({
        field,
        style,
        teamName,
        region,
        sportLabel: sportKo(sportType),
        toneLine: readToneLine(team, tone),
        fullText,
        selected,
      });
      if (typeof ai === "string" && ai.trim()) {
        improved = ai.trim();
        source = "openai";
      }
    } catch (e) {
      logger.warn("[improveTeamPublicTextSelection] OpenAI 실패, 템플릿 사용", {
        msg: e instanceof Error ? e.message : String(e),
      });
    }

    const cap = maxImprovedLen(field, selected.length);
    if (typeof improved !== "string") {
      improved = fallbackTemplate().improvedText;
      source = "template";
    } else if (improved.length > cap) {
      improved = improved.slice(0, cap);
    }
    if (!improved.trim()) {
      const fb = fallbackTemplate();
      improved = fb.improvedText;
      source = fb.source;
    }

    logger.info("[improveTeamPublicTextSelection] ok", { teamId, field, source, style, selLen: selected.length });
    return { ok: true, improvedText: improved, source };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error("[improveTeamPublicTextSelection] unexpected", {
      teamId,
      field,
      style,
      msg: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    const fb = fallbackTemplate();
    return { ok: true, improvedText: fb.improvedText, source: "template" };
  }
});
