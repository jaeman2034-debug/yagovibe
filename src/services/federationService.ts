/**
 * 협회 생성 · AI 자동 콘텐츠
 * Cloud Function generateFederationAIContent 호출 → 실패 시 로컬 더미 fallback
 */

import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  updateDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { db, functions, storage } from "@/lib/firebase";
import type {
  FederationAboutFields,
  FederationImageContentSelectionRow,
  FederationPresident,
} from "@/types/federation";
import type {
  GeneratedContentVariant,
  ImageContentPackage,
  RecommendedUse,
} from "@/types/imageContentPackage";

export type {
  AssociationContext,
  ContentTone,
  GeneratedContentVariant,
  ImageContentPackage,
  RecommendedUse,
} from "@/types/imageContentPackage";

/** 협회 이미지 AI 파이프라인 분석용 (append-only 서브컬렉션) */
export type FederationAiGenerationLogEvent =
  | "generation_complete"
  | "content_applied"
  | "user_edit_saved";

/** placement → 로그용 최종 적용 위치 문자열 */
export function formatAiFinalAppliedPlacement(
  recommendedUse: string,
  placement?: { appliedTo: string; targetSectionKey: string | null }
): string {
  if (!placement) return String(recommendedUse || "").trim() || "unknown";
  if (placement.appliedTo === "association_intro") return "intro_section";
  if (placement.appliedTo === "association_activities") return "activity_section";
  if (placement.appliedTo === "dynamic_section" && placement.targetSectionKey) {
    return `dynamic_section:${placement.targetSectionKey}`;
  }
  return String(recommendedUse || "").trim() || "unknown";
}

export async function logFederationAiGenerationEvent(payload: {
  federationSlug: string;
  event: FederationAiGenerationLogEvent;
  imageId: string;
  imageSectionKey?: string;
  selectedVariantIndex: number;
  selectedTone?: string;
  recommendedUse: string;
  finalAppliedUse?: string;
  isUserEdited: boolean;
  regenerateCount: number;
  placementReason?: string;
  usedFallback?: boolean;
  appliedTo?: string;
  targetSectionKey?: string | null;
}): Promise<void> {
  const slug = String(payload.federationSlug || "").trim();
  if (!slug || !db) return;
  try {
    await addDoc(collection(db, "federations", slug, "aiGenerationLogs"), {
      event: payload.event,
      imageId: String(payload.imageId || "").slice(0, 400),
      imageSectionKey: payload.imageSectionKey != null ? String(payload.imageSectionKey).slice(0, 200) : null,
      selectedVariantIndex: payload.selectedVariantIndex,
      selectedTone:
        typeof payload.selectedTone === "string" && payload.selectedTone.trim()
          ? payload.selectedTone.trim().slice(0, 32)
          : null,
      recommendedUse: String(payload.recommendedUse || "").slice(0, 64),
      finalAppliedUse: String(payload.finalAppliedUse ?? "").slice(0, 200),
      isUserEdited: !!payload.isUserEdited,
      regenerateCount: Math.max(0, Math.floor(payload.regenerateCount)),
      placementReason:
        typeof payload.placementReason === "string" && payload.placementReason.trim()
          ? payload.placementReason.trim().slice(0, 500)
          : null,
      usedFallback: payload.usedFallback === true ? true : payload.usedFallback === false ? false : null,
      appliedTo: payload.appliedTo != null ? String(payload.appliedTo).slice(0, 64) : null,
      targetSectionKey:
        payload.targetSectionKey != null ? String(payload.targetSectionKey).slice(0, 200) : null,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[logFederationAiGenerationEvent] skipped", e);
  }
}

/** 원샷 배치(수동/자동) — `aiGenerationLogs`에 별도 event로 적재 */
export async function logFederationBatchAutoBuild(payload: {
  federationSlug: string;
  trigger: "manual" | "auto";
  httpsImageCount: number;
  packageAttemptCount: number;
  packageSuccessCount: number;
  skippedCount: number;
  draftSaved: boolean;
  applyContent?: boolean;
  cancelled?: boolean;
  errorMessage?: string;
  /** 페이지 자동 구성 템플릿 (balanced | activity_focus | intro_focus) */
  pageTemplate?: string;
}): Promise<void> {
  const slug = String(payload.federationSlug || "").trim();
  if (!slug || !db) return;
  try {
    await addDoc(collection(db, "federations", slug, "aiGenerationLogs"), {
      event: "batch_auto_build",
      trigger: payload.trigger,
      httpsImageCount: Math.max(0, Math.floor(payload.httpsImageCount)),
      packageAttemptCount: Math.max(0, Math.floor(payload.packageAttemptCount)),
      packageSuccessCount: Math.max(0, Math.floor(payload.packageSuccessCount)),
      skippedCount: Math.max(0, Math.floor(payload.skippedCount)),
      draftSaved: !!payload.draftSaved,
      applyContent:
        payload.applyContent === undefined ? null : payload.applyContent === true,
      cancelled: !!payload.cancelled,
      errorMessage: payload.errorMessage
        ? String(payload.errorMessage).trim().slice(0, 500)
        : null,
      pageTemplate: payload.pageTemplate
        ? String(payload.pageTemplate).trim().slice(0, 48)
        : null,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[logFederationBatchAutoBuild] skipped", e);
  }
}

/** 협회 이미지 AI 일별 집계 문서 (Cloud Functions가 aiStats/daily에 기록) */
export type NormalizedPlacementStatsDoc = {
  recommendedCount: Record<string, number>;
  finalCount: Record<string, number>;
  matchedCount: Record<string, number>;
};

export type FederationAiDailyStatsDoc = {
  date: string;
  federationSlug: string;
  totalLogs: number;
  eventCounts: {
    generation_complete: number;
    content_applied: number;
    user_edit_saved: number;
  };
  /** recommended·final 모두 정규화 가능한 건만 */
  placementEvaluated: number;
  /** normalizePlacement(recommended) === normalizePlacement(final) */
  correctPlacement: number;
  editedCount: number;
  contentAppliedCount: number;
  userEditedAmongApplied: number;
  toneCount: {
    official: number;
    community: number;
    marketing: number;
    unknown: number;
  };
  variantIndexCount: { 0: number; 1: number; 2: number };
  /** 집계 시점의 정규화 배치 분포 (디버깅·운영) */
  normalizedPlacementStats?: NormalizedPlacementStatsDoc;
  aggregatedAt?: string;
};

export function seoulYesterdayClient(): string {
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const [y, mo, d] = todayStr.split("-").map((x) => Number(x));
  const noon = new Date(
    `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+09:00`
  );
  const yest = new Date(noon.getTime() - 86400000);
  return yest.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function parseCountMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function parseFederationAiDailyStatsDoc(
  data: Record<string, unknown>,
  federationSlug: string,
  dateStr: string
): FederationAiDailyStatsDoc {
  const ec = (data.eventCounts as Record<string, number> | undefined) || {};
  const tc = (data.toneCount as Record<string, number> | undefined) || {};
  const vic = (data.variantIndexCount as Record<string, number> | undefined) || {};
  const npsRaw = data.normalizedPlacementStats as Record<string, unknown> | undefined;
  const normalizedPlacementStats: NormalizedPlacementStatsDoc | undefined = npsRaw
    ? {
        recommendedCount: parseCountMap(npsRaw.recommendedCount),
        finalCount: parseCountMap(npsRaw.finalCount),
        matchedCount: parseCountMap(npsRaw.matchedCount),
      }
    : undefined;
  return {
    date: String(data.date || dateStr),
    federationSlug: String(data.federationSlug || federationSlug),
    totalLogs: typeof data.totalLogs === "number" ? data.totalLogs : 0,
    eventCounts: {
      generation_complete: Number(ec.generation_complete) || 0,
      content_applied: Number(ec.content_applied) || 0,
      user_edit_saved: Number(ec.user_edit_saved) || 0,
    },
    placementEvaluated: typeof data.placementEvaluated === "number" ? data.placementEvaluated : 0,
    correctPlacement: typeof data.correctPlacement === "number" ? data.correctPlacement : 0,
    editedCount: typeof data.editedCount === "number" ? data.editedCount : 0,
    contentAppliedCount: typeof data.contentAppliedCount === "number" ? data.contentAppliedCount : 0,
    userEditedAmongApplied:
      typeof data.userEditedAmongApplied === "number" ? data.userEditedAmongApplied : 0,
    toneCount: {
      official: Number(tc.official) || 0,
      community: Number(tc.community) || 0,
      marketing: Number(tc.marketing) || 0,
      unknown: Number(tc.unknown) || 0,
    },
    variantIndexCount: {
      0: Number(vic[0] ?? vic["0"]) || 0,
      1: Number(vic[1] ?? vic["1"]) || 0,
      2: Number(vic[2] ?? vic["2"]) || 0,
    },
    normalizedPlacementStats,
    aggregatedAt: typeof data.aggregatedAt === "string" ? data.aggregatedAt : undefined,
  };
}

export async function getFederationAiDailyStats(
  federationSlug: string,
  dateStr: string
): Promise<FederationAiDailyStatsDoc | null> {
  const slug = String(federationSlug || "").trim();
  const day = String(dateStr || "").trim();
  if (!slug || !day || !db) return null;
  // 기존 경로(federations/slug/aiStats/daily/day)는 홀수 세그먼트 오류 유발 → 단일 컬렉션으로 교체
  const ref = doc(db, "federations", slug, "aiStatsDaily", day);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return parseFederationAiDailyStatsDoc(snap.data() as Record<string, unknown>, slug, day);
}

type AggregateFederationAiStatsWire = FederationAiDailyStatsDoc & { ok: true };

export async function runAggregateFederationAiStatsDaily(
  federationSlug: string,
  dateStr?: string
): Promise<FederationAiDailyStatsDoc> {
  const slug = String(federationSlug || "").trim();
  if (!slug) throw new Error("federationSlug가 없습니다.");
  const date = String(dateStr || "").trim() || seoulYesterdayClient();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("date는 YYYY-MM-DD 형식이어야 합니다.");
  }
  const res = await postFirebaseCallableHttp<AggregateFederationAiStatsWire>("aggregateFederationAiStatsDaily", {
    federationSlug: slug,
    date,
  });
  if (!res || res.ok !== true) {
    throw new Error("집계 응답이 올바르지 않습니다.");
  }
  return {
    date: res.date,
    federationSlug: res.federationSlug,
    totalLogs: res.totalLogs,
    eventCounts: res.eventCounts,
    placementEvaluated: res.placementEvaluated,
    correctPlacement: res.correctPlacement,
    editedCount: res.editedCount,
    contentAppliedCount: res.contentAppliedCount,
    userEditedAmongApplied: res.userEditedAmongApplied,
    toneCount: res.toneCount,
    variantIndexCount: res.variantIndexCount,
    normalizedPlacementStats: res.normalizedPlacementStats,
    aggregatedAt: res.aggregatedAt,
  };
}

/** 단일 문서 한도 여유 — 동적 sections 맵만 대략 제한 */
const DRAFT_SECTION_CONTENT_MAX = 900_000;

export type FederationDraftSectionMap = Record<
  string,
  {
    type?: string;
    content?: string;
    draft?: string | null;
    image?: string;
    aiTitle?: string;
    aiSummary?: string;
    aiTags?: string[];
  }
>;

export type SanitizedDynamicSection = {
  type: string;
  content: string;
  draft: string | null;
  image: string;
  aiTitle?: string;
  aiSummary?: string;
  aiTags?: string[];
};

/**
 * Firestore updateDoc은 값에 `undefined`가 있으면 실패할 수 있음.
 * 동적 sections 맵을 저장 직전에 항상 이 함수로 통과시킨다.
 */
export function sanitizeFederationDraftSections(
  sections: FederationDraftSectionMap | undefined | null
): Record<string, SanitizedDynamicSection> {
  const out: Record<string, SanitizedDynamicSection> = {};
  if (!sections || typeof sections !== "object") return out;
  for (const [key, raw] of Object.entries(sections)) {
    if (!key) continue;
    const t = String(raw?.type || "text");
    const type = t === "image" || t === "gallery" ? t : "text";
    const content = String(raw?.content ?? "").slice(0, DRAFT_SECTION_CONTENT_MAX);
    const dr = raw?.draft;
    const draft =
      dr === undefined || dr === null
        ? null
        : String(dr).slice(0, DRAFT_SECTION_CONTENT_MAX);
    const image = String(raw?.image ?? "");
    const row: SanitizedDynamicSection = { type, content, draft, image };
    const aiTitle = String(raw?.aiTitle ?? "").trim().slice(0, 200);
    if (aiTitle) row.aiTitle = aiTitle;
    const aiSummary = String(raw?.aiSummary ?? "").trim().slice(0, 400);
    if (aiSummary) row.aiSummary = aiSummary;
    if (Array.isArray(raw?.aiTags) && raw.aiTags.length > 0) {
      const tags = raw.aiTags
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 14);
      if (tags.length) row.aiTags = tags;
    }
    out[key] = row;
  }
  return out;
}

/** Draft.imageContentSelections — Firestore update 직전 정제 */
export function sanitizeImageContentSelections(
  raw: Record<string, unknown> | null | undefined
): Record<string, FederationImageContentSelectionRow> {
  const out: Record<string, FederationImageContentSelectionRow> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, v] of Object.entries(raw)) {
    if (!key || typeof v !== "object" || !v) continue;
    const o = v as Record<string, unknown>;
    const appliedRaw = o.appliedTo;
    const appliedTo: FederationImageContentSelectionRow["appliedTo"] =
      appliedRaw === "association_intro" ||
      appliedRaw === "association_activities" ||
      appliedRaw === "dynamic_section"
        ? appliedRaw
        : "dynamic_section";
    const idx = Number(o.selectedVariantIndex);
    const selectedVariantIndex = Number.isFinite(idx) ? Math.max(0, Math.floor(idx)) : 0;
    const row: FederationImageContentSelectionRow = {
      imageId: String(o.imageId ?? "").trim().slice(0, 400),
      imageUrl: String(o.imageUrl ?? "").trim().slice(0, 2000),
      imageSectionKey: String(o.imageSectionKey ?? key).trim().slice(0, 200),
      targetSectionKey:
        o.targetSectionKey === null || o.targetSectionKey === undefined
          ? null
          : String(o.targetSectionKey).trim().slice(0, 200) || null,
      selectedVariantIndex,
      selectedTone: String(o.selectedTone ?? "").trim().slice(0, 40),
      title: String(o.title ?? "").trim().slice(0, 200),
      summary: String(o.summary ?? "").trim().slice(0, 400),
      content: String(o.content ?? "").trim().slice(0, DRAFT_SECTION_CONTENT_MAX),
      tags: Array.isArray(o.tags)
        ? o.tags.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 14)
        : [],
      recommendedUse: String(o.recommendedUse ?? "").trim().slice(0, 48),
      appliedTo,
    };
    if (o.isUserEdited === true) {
      row.isUserEdited = true;
      const ed = typeof o.editedAt === "string" ? o.editedAt.trim().slice(0, 40) : "";
      if (ed) row.editedAt = ed;
    }
    out[key] = row;
  }
  return out;
}

const FEDERATION_FUNCTIONS_REGION = "asia-northeast3";

/**
 * 배포된 Callable 이름 기준 HTTPS URL.
 * 우선순위: VITE_FIREBASE_CALLABLE_BASE_URL → VITE_API_BASE_URL(cloudfunctions) → VITE_FUNCTIONS_ORIGIN(cloudfunctions) → 기본 호스트
 */
function resolveFirebaseCallableUrl(functionName: string): string {
  const name = String(functionName || "").replace(/^\//, "");
  const baseCallable = String(import.meta.env.VITE_FIREBASE_CALLABLE_BASE_URL || "").trim().replace(/\/$/, "");
  if (baseCallable) {
    return `${baseCallable}/${name}`;
  }

  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const useEmu =
    isLocal &&
    import.meta.env.VITE_USE_EMULATOR === "true" &&
    import.meta.env.VITE_FUNCTIONS_EMULATOR === "true";
  if (useEmu) {
    const port = String(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || "5011");
    const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "yago-vibe-spt");
    return `http://127.0.0.1:${port}/${projectId}/${FEDERATION_FUNCTIONS_REGION}/${name}`;
  }

  const apiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (apiBase.includes("cloudfunctions.net")) {
    return `${apiBase}/${name}`;
  }

  const fnOrigin = String(import.meta.env.VITE_FUNCTIONS_ORIGIN || "").trim().replace(/\/$/, "");
  if (fnOrigin.includes("cloudfunctions.net")) {
    return `${fnOrigin}/${name}`;
  }

  const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || "yago-vibe-spt");
  return `https://${FEDERATION_FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/${name}`;
}

type CallableWireResult<T> = { result?: T; error?: { message?: string; status?: string } };

async function postFirebaseCallableHttp<T>(functionName: string, data: unknown): Promise<T> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }
  const token = await user.getIdToken();
  const url = resolveFirebaseCallableUrl(functionName);
  if (import.meta.env.DEV) {
    console.debug(`[Callable HTTP] ${functionName}`, url);
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });
  const json = (await res.json().catch(() => ({}))) as CallableWireResult<T>;
  if (json.error) {
    const msg = json.error.message || json.error.status || `${functionName} 호출 실패`;
    throw new Error(msg);
  }
  if (json.result === undefined || json.result === null) {
    throw new Error(
      res.ok
        ? `${functionName} 응답이 비어 있습니다.`
        : `${functionName} HTTP ${res.status} (본문 파싱 실패)`
    );
  }
  return json.result;
}
/** 한글→로마자 매핑 (지역·종목) — nowon-football 형태 유지 */
const SLUG_ROMAN: Record<string, string> = {
  노원: "nowon", 강남: "gangnam", 송파: "songpa", 마포: "mapo", 서초: "seocho",
  강서: "gangseo", 영등포: "yeongdeungpo", 동작: "dongjak", 관악: "guanak",
  서울: "seoul", 경기: "gyeonggi", 인천: "incheon",
  축구: "football", 농구: "basketball", 야구: "baseball", 배구: "volleyball", 풋살: "futsal", 배드민턴: "badminton",
  구: "gu", 시: "si", 도: "do", 협회: "", 아카데미: "academy",
};

const SPORT_SLUG: Record<string, string> = {
  soccer: "football", football: "football", futsal: "futsal",
  basketball: "basketball", baseball: "baseball", volleyball: "volleyball", badminton: "badminton",
};

export function generateSlug(name: string, sport?: string): string {
  const fromLatin = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
  if (fromLatin.length >= 2) return fromLatin.slice(0, 96);

  let s = name.trim();
  for (const [kr, en] of Object.entries(SLUG_ROMAN)) {
    s = s.replace(new RegExp(kr, "g"), en ? ` ${en} ` : " ");
  }
  s = s
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (s.length >= 2) return s.slice(0, 96);

  const sportSlug = sport ? SPORT_SLUG[sport] || sport : "";
  const hash = Math.random().toString(36).slice(2, 8);
  return sportSlug ? `${sportSlug}-${hash}` : `fed-${hash}`;
}

const SPORT_LABEL: Record<string, string> = {
  soccer: "축구",
  football: "축구",
  basketball: "농구",
  baseball: "야구",
  volleyball: "배구",
  futsal: "풋살",
  badminton: "배드민턴",
  all: "스포츠",
};

function sportLabel(sport: string): string {
  return SPORT_LABEL[sport] ?? sport;
}

/** 로컬 더미 fallback (Cloud Function 미배포/실패 시) */
export type FederationAIContentResult = {
  description: string;
  introMessage: string;
  history: string;
  vision: string;
  activities: string[];
  presidentName: string;
  president: FederationPresident;
  /** federations.organization.summary + executives 서브컬렉션 시드 */
  organization: { summary: string };
  executives: { name: string; role: string; photo?: string }[];
  themeColor: string;
  templateType: string;
  region: string;
};

function getDummyContent(input: {
  name: string;
  sport?: string;
}): FederationAIContentResult {
  const sp = input.sport || "soccer";
  const label = sportLabel(sp);
  const name = input.name.trim();
  const introMessage =
    `${name} 공식 홈페이지를 찾아주신 여러분께 진심으로 감사드립니다.\n\n` +
    `저희 ${name}는 지역 ${label}의 건전한 경기 문화와 회원 여러분의 참여를 바탕으로, 함께 성장하는 협회를 지향합니다.\n\n` +
    `앞으로도 회원과 지역 사회에 신뢰받는 협회가 되도록 최선을 다하겠습니다.`;
  const president: FederationPresident = {
    name: "협회장 (가칭)",
    message: introMessage,
  };
  return {
    introMessage,
    description: `${name}는 지역 ${label} 발전과 시민 건강을 위해 활동하는 협회입니다.`,
    history:
      `${name}는 지역 클럽·학교·동호회가 함께 성장할 수 있도록 설립되었습니다.\n\n` +
      `설립 이후 공정한 리그 운영과 지도자·심판 교육을 통해 회원 참여의 폭을 넓혀 왔으며, 지자체와 협력해 지역 행사를 이어가고 있습니다.\n\n` +
      `앞으로도 안전하고 신뢰받는 경기 환경을 만들겠습니다.`,
    organization: {
      summary:
        `${name}는 사무국을 중심으로 회원 등록·리그 운영·대외 협력 업무를 수행합니다.\n\n` +
        `운영·기술·기획 분과가 협력하여 ${label} 종목에 맞는 대회·교육 프로그램을 준비합니다.`,
    },
    vision: `${name}는 지역 ${label}의 건강한 경기 문화와 참여 기회 확대를 지향합니다.`,
    activities: [
      `${label} 리그 및 친선대회 운영`,
      "유소년·지도자·심판 교육 프로그램",
      "지역 행사 및 클럽 네트워킹",
    ],
    presidentName: president.name,
    president,
    executives: [
      { name: "사무국장 (가칭)", role: "사무국장" },
      { name: "운영이사 (가칭)", role: "운영이사" },
      { name: "기획팀 (가칭)", role: "기획팀" },
    ],
    themeColor: sp === "soccer" || sp === "football" ? "green" : "blue",
    templateType: "default",
    region: "지역 설정 예정",
  };
}

/**
 * Cloud Function AI 생성 → 실패 시 로컬 더미
 */
type CallableFederationAI = {
  description?: string;
  introMessage?: string;
  history?: string;
  vision?: string;
  activities?: string[];
  presidentName?: string;
  president?: { name?: string; message?: string };
  executives?: { name: string; role: string; photo?: string }[];
  themeColor?: string;
  templateType?: string;
  region?: string;
  organization?: { summary?: string };
};

function mergeAIContent(data: CallableFederationAI, input: { name: string; sport?: string }): FederationAIContentResult {
  const dummy = getDummyContent(input);
  const body =
    String(data.introMessage || "").trim() ||
    String(data.president?.message || "").trim() ||
    "";
  const presName =
    String(data.president?.name || data.presidentName || "").trim() || dummy.president.name;
  const introMessage = body || dummy.introMessage;
  const pres: FederationPresident = { name: presName, message: introMessage };
  const activities =
    Array.isArray(data.activities) && data.activities.length > 0
      ? data.activities.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12)
      : dummy.activities;

  const orgSummary =
    String(data.organization?.summary || "").trim() || dummy.organization.summary;

  return {
    description: data.description?.trim() || dummy.description,
    introMessage,
    history: data.history?.trim() || dummy.history,
    vision: data.vision?.trim() || dummy.vision,
    activities,
    presidentName: pres.name,
    president: pres,
    organization: { summary: orgSummary },
    executives:
      Array.isArray(data.executives) && data.executives.length >= 1 ? data.executives : dummy.executives,
    themeColor: data.themeColor || dummy.themeColor,
    templateType: data.templateType?.trim() || "default",
    region: data.region?.trim() || dummy.region,
  };
}

export async function generateFederationContent(input: {
  name: string;
  sport?: string;
  audience?: string;
}): Promise<FederationAIContentResult> {
  try {
    const fn = httpsCallable<{ name: string; sport?: string; audience?: string }, CallableFederationAI>(
      functions,
      "generateFederationAIContent"
    );
    const res = await fn({ name: input.name, sport: input.sport, audience: input.audience });
    const data = res.data;
    if (data && typeof data === "object") {
      return mergeAIContent(data, input);
    }
  } catch (_) {
    // Function 미배포·네트워크 오류 등 → 로컬 fallback
  }
  return getDummyContent(input);
}

export type AutoCreateFederationInput = {
  name: string;
  sport?: string;
  audience?: string;
  /** Hero 대표 이미지 URL (템플릿 선택 또는 업로드) */
  heroImage?: string;
  /** 직접 설정(옵션) — 있으면 AI 필드 일부 덮어씀 */
  manual?: {
    description?: string;
    introMessage?: string;
  };
};

export type AutoCreateFederationResult = {
  slug: string;
  id: string;
};

/** Hero 이미지 Firebase Storage 업로드 */
export async function uploadFederationHeroImage(file: File): Promise<string> {
  if (!storage) throw new Error("Storage not initialized");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `federations/hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** 협회 커버 이미지 업로드 (고정 경로) */
export async function uploadFederationCoverImage(file: File, federationId: string): Promise<string> {
  if (!storage) throw new Error("Storage not initialized");
  const normalizedId = String(federationId || "").trim();
  if (!normalizedId) throw new Error("federationId가 필요합니다.");
  const storageRef = ref(storage, `federations/${normalizedId}/cover.jpg`);
  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
  });
  return getDownloadURL(storageRef);
}

/** 협회 로고 업로드 (고정 경로) */
export async function uploadFederationLogoImage(file: File, federationId: string): Promise<string> {
  if (!storage) throw new Error("Storage not initialized");
  const normalizedId = String(federationId || "").trim();
  if (!normalizedId) throw new Error("federationId가 필요합니다.");
  const storageRef = ref(storage, `federations/${normalizedId}/logo.png`);
  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/png",
  });
  return getDownloadURL(storageRef);
}

/** sport 기반 기본 Hero 이미지 URL */
export function getDefaultHeroImage(sport?: string): string {
  const defaults: Record<string, string> = {
    soccer: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
    football: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
    futsal: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
    basketball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
    baseball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
    volleyball: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
    badminton: "https://images.unsplash.com/photo-1529900742904-029cd2c0a75c?w=800&q=80",
  };
  return defaults[sport || "soccer"] ?? defaults.soccer;
}

/**
 * 클라이언트에서 Firestore에 협회 + 임원 서브컬렉션 생성
 * (서버 API 도입 시 동일 시그니처의 HTTPS Callable로 감쌀 것)
 */
export async function autoCreateFederation(
  ownerId: string,
  input: AutoCreateFederationInput
): Promise<AutoCreateFederationResult> {
  const name = input.name.trim();
  if (!name) throw new Error("협회 이름이 필요합니다.");

  const slug = generateSlug(name, input.sport) || `fed-${Math.random().toString(36).slice(2, 8)}`;

  const ai = await generateFederationContent({
    name,
    sport: input.sport,
    audience: input.audience,
  });

  const description = input.manual?.description ?? ai.description;
  /** 협회장 인사말 본문 — Firestore introMessage와 president.message 동기화 */
  const introMessage = input.manual?.introMessage ?? ai.introMessage;
  const presidentForDoc = {
    name: ai.president.name,
    message: introMessage,
  };

  const fedRef = doc(db, "federations", slug);
  const now = serverTimestamp();

  const fedData = {
    name,
    slug,
    sport: input.sport || "soccer",
    audience: input.audience || "all",
    region: ai.region,
    ...(input.heroImage ? { heroImage: input.heroImage } : {}),
    introMessage,
    description,
    history: ai.history,
    vision: ai.vision,
    activities: ai.activities,
    organization: { summary: ai.organization.summary },
    president: presidentForDoc,
    presidentName: presidentForDoc.name,
    themeColor: ai.themeColor,
    templateType: ai.templateType,
    autoGenerated: true,
    leagueCount: 0,
    ownerId,
    ownerUid: ownerId, // v1 권한 아키텍처 정렬: ownerUid 병행 저장
    adminIds: [ownerId],
    roles: {
      admins: [ownerId],
      editors: [],
      viewers: [],
    },
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  // 1단계: federation 문서 먼저 생성 (rules: ownerId, slug 검증)
  try {
    const batch1 = writeBatch(db);
    batch1.set(fedRef, fedData);
    await batch1.commit();
  } catch (err) {
    console.error("[autoCreateFederation] batch1(federation) 실패:", {
      slug,
      ownerId,
      rules요건: "ownerId==auth.uid, slug==docId, name:string",
      error: err,
    });
    throw err;
  }

  // 2단계: executives 생성 (부모 문서 존재 후 isFederationManager 통과)
  if (ai.executives.length > 0) {
    try {
      const batch2 = writeBatch(db);
      for (const e of ai.executives) {
        const exRef = doc(collection(db, "federations", slug, "executives"));
        batch2.set(exRef, {
          name: e.name,
          role: e.role,
          ...(e.photo ? { photo: e.photo } : {}),
          createdAt: now,
        });
      }
      await batch2.commit();
    } catch (err) {
      console.error("[autoCreateFederation] batch2(executives) 실패:", { slug, error: err });
      throw err;
    }
  }

  return { slug, id: slug };
}

/** 협회 소개 탭 필드만 부분 업데이트 */
export async function updateFederationAbout(
  federationSlug: string,
  patch: FederationAboutFields
): Promise<void> {
  const normalizedSlug = String(federationSlug || "").trim();
  if (!normalizedSlug) {
    console.error("[updateFederationAbout] federationSlug 누락", {
      federationSlug,
      patchKeys: Object.keys(patch || {}),
    });
    throw new Error("federationSlug가 없어 저장할 수 없습니다.");
  }
  console.log("[updateFederationAbout] write start", {
    path: `federations/${normalizedSlug}`,
    patchKeys: Object.keys(patch || {}),
  });
  const ref = doc(db, "federations", normalizedSlug);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.introMessage !== undefined) payload.introMessage = patch.introMessage;
  if (patch.history !== undefined) payload.history = patch.history;
  if (patch.vision !== undefined) payload.vision = patch.vision;
  if (patch.activities !== undefined) payload.activities = patch.activities;
  if (patch.chairpersonPhotoUrl !== undefined) payload.chairpersonPhotoUrl = patch.chairpersonPhotoUrl;
  if (patch.sectionOrder !== undefined) payload.sectionOrder = patch.sectionOrder;
  if (patch.sections !== undefined) payload.sections = patch.sections;
  if (patch.president !== undefined) {
    payload.president = patch.president;
    payload.presidentName = patch.president.name;
  }
  if (patch.organization !== undefined) {
    payload.organization = patch.organization;
  }
  await updateDoc(ref, payload);
  console.log("[updateFederationAbout] write success", {
    path: `federations/${normalizedSlug}`,
  });
}

/** 협회 소개 Draft만 부분 업데이트 (Publish 전 단계) */
export async function updateFederationDraftAbout(
  federationSlug: string,
  patch: FederationAboutFields
): Promise<void> {
  const normalizedSlug = String(federationSlug || "").trim();
  if (!normalizedSlug) {
    console.error("[updateFederationDraftAbout] federationSlug 누락", {
      federationSlug,
      patchKeys: Object.keys(patch || {}),
    });
    throw new Error("federationSlug가 없어 Draft 저장할 수 없습니다.");
  }
  console.log("[updateFederationDraftAbout] write start", {
    path: `federations/${normalizedSlug}`,
    patchKeys: Object.keys(patch || {}),
  });
  const ref = doc(db, "federations", normalizedSlug);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    "draft.updatedAt": serverTimestamp(),
  };
  if (patch.introMessage !== undefined) payload["draft.introMessage"] = patch.introMessage;
  if (patch.history !== undefined) payload["draft.history"] = patch.history;
  if (patch.vision !== undefined) payload["draft.vision"] = patch.vision;
  if (patch.activities !== undefined) payload["draft.activities"] = patch.activities;
  if (patch.chairpersonPhotoUrl !== undefined) payload["draft.chairpersonPhotoUrl"] = patch.chairpersonPhotoUrl;
  if (patch.sectionOrder !== undefined) payload["draft.sectionOrder"] = patch.sectionOrder;
  if (patch.sections !== undefined) {
    payload["draft.sections"] = sanitizeFederationDraftSections(
      patch.sections as FederationDraftSectionMap
    );
  }
  if (patch.president !== undefined) {
    payload["draft.president"] = patch.president;
    payload["draft.presidentName"] = patch.president.name;
  }
  if (patch.organization !== undefined) {
    payload["draft.organization"] = patch.organization;
  }
  if (patch.imageContentSelections !== undefined) {
    payload["draft.imageContentSelections"] = sanitizeImageContentSelections(
      patch.imageContentSelections as Record<string, unknown>
    );
  }
  if (import.meta.env.DEV) {
    console.debug("[updateFederationDraftAbout] Firestore 필드 경로", Object.keys(payload));
  }
  try {
    await updateDoc(ref, payload);
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    if (code === "permission-denied") {
      console.error("[updateFederationDraftAbout] permission-denied", {
        path: `federations/${normalizedSlug}`,
        original: e,
      });
      throw new Error(
        "Draft 저장이 Firestore 권한으로 거부되었습니다. 협회 소유자·관리자(또는 플랫폼 ADMIN)인지 확인하고, 콘솔에 배포한 보안 규칙이 최신인지 확인하세요."
      );
    }
    throw e;
  }
  console.log("[updateFederationDraftAbout] write success", {
    path: `federations/${normalizedSlug}`,
  });
}

/** Draft를 Published로 반영 (운영 공개). 레거시 호환을 위해 live도 동시 갱신 */
export async function publishFederationDraft(
  federationSlug: string
): Promise<void> {
  const ref = doc(db, "federations", federationSlug);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as any;
  const draft = data?.draft;
  if (!draft || typeof draft !== "object") {
    throw new Error("공개할 Draft 데이터가 없습니다.");
  }

  // Publish 직전의 published/live를 버전으로 백업
  const publishedOrLive =
    data?.published && typeof data.published === "object"
      ? data.published
      : (data?.live && typeof data.live === "object" ? data.live : null);
  if (publishedOrLive && typeof publishedOrLive === "object") {
    const versionSnap = await getDocs(
      query(collection(db, "federations", federationSlug, "versions"), orderBy("createdAt", "desc"), limit(1))
    );
    const latest = versionSnap.docs[0]?.data() as any;
    const latestNum =
      typeof latest?.versionNumber === "number" && Number.isFinite(latest.versionNumber)
        ? latest.versionNumber
        : 0;
    const nextNum = latestNum + 1;
    await addDoc(collection(db, "federations", federationSlug, "versions"), {
      ...publishedOrLive,
      versionNumber: nextNum,
      versionName: `v${nextNum}`,
      createdAt: serverTimestamp(),
    });
  }

  await updateDoc(ref, {
    published: draft,
    live: draft,
    status: "published",
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getFederationVersions(
  federationSlug: string
): Promise<Array<{ id: string; versionName?: string; versionNumber?: number; createdAt?: any; [k: string]: any }>> {
  const snap = await getDocs(
    query(collection(db, "federations", federationSlug, "versions"), orderBy("createdAt", "desc"), limit(30))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function rollbackFederationVersion(
  federationSlug: string,
  version: { sections?: any; sectionOrder?: any; [k: string]: any }
): Promise<void> {
  const ref = doc(db, "federations", federationSlug);
  const restored = {
    sections: version.sections || {},
    sectionOrder: Array.isArray(version.sectionOrder) ? version.sectionOrder : [],
  };
  await updateDoc(ref, {
    published: restored,
    live: restored,
    status: "published",
    updatedAt: serverTimestamp(),
  });
}

/**
 * 동적 이미지 섹션 URL → 텍스트 섹션용 한국어 초안.
 * 프로덕션에 `generateFederationImageDescription`이 없을 수 있어,
 * 배포된 `extractTextFromImages` → `generateFederationSection`(vision, dryRun) 파이프라인을 사용한다.
 */
export async function generateFederationDescriptionFromImage(
  imageUrl: string,
  federationSlug: string
): Promise<string> {
  const trimmed = String(imageUrl || "").trim();
  const slug = String(federationSlug || "").trim();
  if (!trimmed) {
    throw new Error("이미지 URL이 없습니다.");
  }
  if (!slug) {
    throw new Error("federationSlug가 없습니다.");
  }
  try {
    /** raw fetch(POST) 대신 SDK — Callable URL에 대한 잘못된 GET(브라우저/봇)과 혼동·프록시 이슈 완화 */
    const extractCallable = httpsCallable<
      { imageUrls: string[] },
      { text?: string; error?: string }
    >(functions, "extractTextFromImages");
    const extractSnap = await extractCallable({ imageUrls: [trimmed] });
    const ocrRes = extractSnap.data;
    let ocrText = String(ocrRes?.text || "").trim();
    if (!ocrText && ocrRes?.error) {
      throw new Error(String(ocrRes.error));
    }
    if (ocrText.length < 12) {
      ocrText =
        "이미지에서 읽을 텍스트가 거의 없습니다. 스포츠 협회 소개 페이지에 어울리는 비전·활동을 담은 문구로 작성해 주세요. 원문에 없는 사실은 추측하지 마세요.";
    }

    const sectionCallable = httpsCallable<
      { federationSlug: string; section: string; sourceText: string; dryRun?: boolean },
      { ok?: boolean; vision?: string; error?: string }
    >(functions, "generateFederationSection");
    const sectionSnap = await sectionCallable({
      federationSlug: slug,
      section: "vision",
      sourceText:
        "아래는 협회 소개 페이지에 넣을 이미지에서 추출한 참고 텍스트입니다. 이를 바탕으로 공식적인 톤의 한국어 비전·소개 문단(3~6문장)을 작성해 주세요.\n\n---\n" +
        ocrText,
      dryRun: true,
    });
    const sectionRes = sectionSnap.data;

    if (sectionRes && sectionRes.ok === false) {
      throw new Error(String(sectionRes.error || "비전 문단 생성에 실패했습니다."));
    }
    const vision = String(sectionRes?.vision || "").trim();
    if (!vision) {
      throw new Error(String(sectionRes?.error || "AI가 생성한 문장이 비어 있습니다."));
    }
    return vision;
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? String((e as { code?: string }).code)
        : "";
    const msg = e instanceof Error ? e.message : "";
    if (code === "internal" || /INTERNAL/i.test(msg)) {
      throw new Error(
        "AI 설명 호출이 서버에서 실패했습니다. (extractTextFromImages·generateFederationSection 배포·OPENAI_API_KEY·로그인·Functions)"
      );
    }
    if (code === "permission-denied" || /permission/i.test(msg)) {
      throw new Error(
        "AI 설명 호출이 권한으로 거부되었습니다. (로그인·Functions invoker·IAM 확인)"
      );
    }
    throw e;
  }
}

function ensureTags(tags: string[], sport: string, region: string): string[] {
  const t = [...new Set(tags.map((x) => x.trim()).filter(Boolean))];
  if (t.length >= 2) return t.slice(0, 5);
  const extra = ["협회", sport, region].filter((x) => x && !t.includes(x));
  return [...t, ...extra].filter(Boolean).slice(0, 5);
}

/** Callable·LLM 없이 단일 본문으로 3톤 패키지 형태만 맞춤 */
function imageContentPackageFromPlainText(
  text: string,
  imageId: string,
  federationSlug: string,
  context?: {
    federationName?: string;
    sport?: string;
    region?: string;
    associationName?: string;
    sportType?: string;
  }
): ImageContentPackage {
  const body = String(text || "").trim();
  const name = String(context?.associationName || context?.federationName || "").trim();
  const sport = String(context?.sportType || context?.sport || "스포츠").trim();
  const region = String(context?.region || "지역").trim();
  const baseTitle = name ? `${name} 활동` : "협회 활동 소개";

  const variants: GeneratedContentVariant[] = [
    {
      tone: "official",
      title: baseTitle.slice(0, 80),
      summary: body.slice(0, 120) || `${region} ${sport} 협회 활동 소개`,
      content: body || `${region}에서 진행된 ${sport} 관련 협회 활동입니다.`,
      tags: ensureTags([sport, region], sport, region),
      recommendedUse: "intro_section",
      confidence: 0.45,
    },
    {
      tone: "community",
      title: `함께하는 ${sport}`.slice(0, 80),
      summary: body.slice(0, 120) || `회원과 함께하는 ${region} ${sport}`,
      content: body || `${name || "협회"} 회원들과 함께하는 ${sport} 활동 모습입니다.`,
      tags: ensureTags(["커뮤니티", sport], sport, region),
      recommendedUse: "activity_section",
      confidence: 0.42,
    },
    {
      tone: "marketing",
      title: `${region} ${sport}, 함께해요`.slice(0, 80),
      summary: body.slice(0, 120) || `${sport} 협회의 활기찬 현장`,
      content:
        body ||
        `${name || "협회"}의 ${sport} 프로그램에 관심이 있다면 활동 소식을 확인해 보세요.`,
      tags: ensureTags(["홍보", sport], sport, region),
      recommendedUse: "general_post",
      confidence: 0.4,
    },
  ];

  return {
    imageId,
    federationSlug,
    associationContext: {
      associationName: name || undefined,
      sportType: sport,
      region: context?.region,
    },
    variants,
    bestVariantIndex: 0,
    createdAt: new Date().toISOString(),
    usedFallback: true,
  };
}

export type FetchFederationImageContentPackageParams = {
  imageUrl: string;
  federationSlug: string;
  /** 추적용 (섹션 키·슬러그 조합 등) */
  imageId?: string;
  context?: {
    federationName?: string;
    sport?: string;
    region?: string;
    associationName?: string;
    sportType?: string;
  };
  /** 같은 이미지에서 「다시 생성」 누른 횟수(1부터). 0이면 초기 생성 */
  regenerateCount?: number;
  /** 재생성 시 결과 분기용(타임스탬프 등). regenerateCount>0일 때 권장 */
  variationSeed?: number;
  /** 서버·프롬프트 힌트용(선택) */
  forceRegenerate?: boolean;
};

/**
 * 구조화 패키지 `ImageContentPackage` (variants[3]).
 * Callable 실패 시 OCR+섹션 단일 본문으로 동일 스키마 폴백.
 */
export async function fetchFederationImageContentPackage(
  params: FetchFederationImageContentPackageParams
): Promise<ImageContentPackage> {
  const trimmed = String(params.imageUrl || "").trim();
  const slug = String(params.federationSlug || "").trim();
  const imageId =
    String(params.imageId || "").trim() ||
    `img_${slug}_${Math.abs(hashString(trimmed)).toString(16).slice(0, 10)}`;

  if (!trimmed || !slug) {
    throw new Error("imageUrl과 federationSlug가 필요합니다.");
  }

  const ctxPayload = {
    federationName: params.context?.federationName,
    sport: params.context?.sport,
    region: params.context?.region,
    associationName: params.context?.associationName,
    sportType: params.context?.sportType,
  };

  const regen = Math.max(0, Math.min(100, Math.floor(Number(params.regenerateCount) || 0)));
  const seed = Number(params.variationSeed);
  const variationPayload =
    regen > 0 || (Number.isFinite(seed) && seed !== 0)
      ? {
          regenerateCount: regen,
          ...(Number.isFinite(seed) ? { variationSeed: seed } : {}),
          ...(params.forceRegenerate ? { forceRegenerate: true } : {}),
        }
      : params.forceRegenerate
        ? { forceRegenerate: true }
        : {};

  try {
    const res = await postFirebaseCallableHttp<
      | (ImageContentPackage & { ok?: true })
      | { ok: false; error?: string; variants?: unknown }
    >("generateFederationImageContentPackage", {
      imageUrl: trimmed,
      federationSlug: slug,
      imageId,
      context: ctxPayload,
      ...variationPayload,
    });

    if (res && typeof res === "object" && "ok" in res && res.ok === false) {
      throw new Error(String((res as { error?: string }).error || "패키지 생성 실패"));
    }

    const pkg = res as ImageContentPackage & { ok?: boolean };
    if (!Array.isArray(pkg.variants) || pkg.variants.length !== 3) {
      throw new Error("패키지 variants 형식 오류");
    }

    return {
      imageId: String(pkg.imageId || imageId),
      federationSlug: pkg.federationSlug || slug,
      associationContext: pkg.associationContext,
      variants: pkg.variants.map((v) => ({
        tone: v.tone,
        title: String(v.title || "").slice(0, 80),
        summary: String(v.summary || "").slice(0, 120),
        content: String(v.content || "").slice(0, 500),
        tags: Array.isArray(v.tags)
          ? v.tags.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 5)
          : [],
        recommendedUse: (["hero_banner", "intro_section", "activity_section", "market_post", "general_post"].includes(
          String(v.recommendedUse)
        )
          ? v.recommendedUse
          : "general_post") as RecommendedUse,
        confidence:
          typeof v.confidence === "number" && Number.isFinite(v.confidence)
            ? Math.min(1, Math.max(0, v.confidence))
            : 0.5,
      })),
      bestVariantIndex:
        typeof pkg.bestVariantIndex === "number" && pkg.bestVariantIndex >= 0 && pkg.bestVariantIndex <= 2
          ? pkg.bestVariantIndex
          : 0,
      createdAt: String(pkg.createdAt || new Date().toISOString()),
      usedFallback: !!pkg.usedFallback,
      placementReason:
        typeof pkg.placementReason === "string" && pkg.placementReason.trim()
          ? pkg.placementReason.trim().slice(0, 500)
          : undefined,
    };
  } catch (firstErr) {
    try {
      const text = await generateFederationDescriptionFromImage(trimmed, slug);
      return imageContentPackageFromPlainText(text, imageId, slug, params.context);
    } catch {
      throw firstErr instanceof Error ? firstErr : new Error(String(firstErr));
    }
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Cloud Function `generateFederationIntroMessage` — 협회장 인사말(introMessage)만 생성
 * (전체 JSON 생성과 분리: 재생성·프롬프트 품질 최적화)
 */
export async function generateFederationIntroMessageOnly(input: {
  name: string;
  sport?: string;
  audience?: string;
}): Promise<string> {
  try {
    const fn = httpsCallable<
      { name: string; sport?: string; audience?: string },
      { introMessage?: string }
    >(functions, "generateFederationIntroMessage");
    const res = await fn({ name: input.name, sport: input.sport, audience: input.audience });
    const t = res.data?.introMessage?.trim();
    if (t) return t;
  } catch (e) {
    console.warn("[generateFederationIntroMessageOnly]", e);
  }
  return getDummyContent(input).introMessage;
}

/** 인사말만 AI로 다시 생성 후 Firestore 반영 (협회장 이름은 유지) */
export async function regenerateFederationIntroMessage(
  federationSlug: string,
  meta: { name: string; sport?: string; audience?: string },
  presidentName: string
): Promise<string> {
  const introMessage = await generateFederationIntroMessageOnly(meta);
  const pname = presidentName.trim() || "협회장";
  await updateFederationAbout(federationSlug, {
    introMessage,
    president: { name: pname, message: introMessage },
  });
  return introMessage;
}

/** 연혁 전용 Callable */
export async function generateFederationHistoryOnly(input: {
  name: string;
  sport?: string;
  audience?: string;
}): Promise<string> {
  try {
    const fn = httpsCallable<
      { name: string; sport?: string; audience?: string },
      { history?: string }
    >(functions, "generateFederationHistory");
    const res = await fn({ name: input.name, sport: input.sport, audience: input.audience });
    const h = res.data?.history?.trim();
    if (h) return h;
  } catch (e: unknown) {
    const fe = e as { code?: string; message?: string; details?: unknown };
    console.warn("[generateFederationHistoryOnly]", fe?.code ?? e, fe?.message ?? e);
  }
  return getDummyContent(input).history;
}

export async function regenerateFederationHistory(
  federationSlug: string,
  meta: { name: string; sport?: string; audience?: string }
): Promise<string> {
  const history = await generateFederationHistoryOnly(meta);
  await updateFederationAbout(federationSlug, { history });
  return history;
}

/** 문서에서 추출한 원문을 협회 연혁 문체로 정리 (Cloud Function) */
export async function refineFederationHistoryText(rawText: string): Promise<string> {
  const trimmed = rawText.trim();
  if (!trimmed) return "";
  try {
    const fn = httpsCallable<{ rawText: string }, { history?: string }>(
      functions,
      "refineFederationHistory"
    );
    const res = await fn({ rawText: trimmed });
    const h = res.data?.history?.trim();
    if (h) return h;
  } catch (e) {
    console.warn("[refineFederationHistoryText]", e);
  }
  return trimmed;
}

/**
 * 연혁 원본 파일을 Storage에 보관 — `federations/{slug}/files/history.{pdf|docx|txt}`
 * 기존 파일 불러오기에서 사용
 */
export async function uploadFederationHistorySourceFile(federationSlug: string, file: File): Promise<void> {
  if (!storage) throw new Error("Storage not initialized");
  const lower = file.name.toLowerCase();
  let ext = "pdf";
  if (lower.endsWith(".docx")) ext = "docx";
  else if (lower.endsWith(".txt")) ext = "txt";
  else if (lower.endsWith(".pdf")) ext = "pdf";
  const path = `federations/${federationSlug}/files/history.${ext}`;
  await uploadBytes(ref(storage, path), file, {
    contentType: file.type || undefined,
  });
}

/** Storage에 올라간 history.* 중 첫 번째로 찾아 Blob 반환 */
export async function tryLoadFederationHistorySourceBlob(
  federationSlug: string
): Promise<{ blob: Blob; fileName: string } | null> {
  if (!storage) return null;
  const candidates: { path: string; fileName: string }[] = [
    { path: `federations/${federationSlug}/files/history.pdf`, fileName: "history.pdf" },
    { path: `federations/${federationSlug}/files/history.docx`, fileName: "history.docx" },
    { path: `federations/${federationSlug}/files/history.txt`, fileName: "history.txt" },
  ];
  for (const { path, fileName } of candidates) {
    try {
      const url = await getDownloadURL(ref(storage, path));
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      return { blob, fileName };
    } catch {
      /* try next */
    }
  }
  return null;
}

export type FederationOrganizationPayload = {
  summary: string;
  executives: { name: string; role: string }[];
};

/** 조직 요약 + 임원 목록만 생성 (Callable) */
export async function generateFederationOrganizationOnly(input: {
  name: string;
  sport?: string;
  audience?: string;
}): Promise<FederationOrganizationPayload> {
  try {
    const fn = httpsCallable<
      { name: string; sport?: string; audience?: string },
      { organization?: { summary?: string }; executives?: { name: string; role: string }[] }
    >(functions, "generateFederationOrganization");
    const res = await fn({ name: input.name, sport: input.sport, audience: input.audience });
    const d = res.data;
    const summary = String(d?.organization?.summary || "").trim();
    const executives = Array.isArray(d?.executives) ? d.executives : [];
    if (summary && executives.length > 0) {
      return {
        summary,
        executives: executives.map((e) => ({
          name: String(e.name || "").trim(),
          role: String(e.role || "").trim(),
        })),
      };
    }
  } catch (e) {
    console.warn("[generateFederationOrganizationOnly]", e);
  }
  const dummy = getDummyContent(input);
  return { summary: dummy.organization.summary, executives: dummy.executives };
}

/** organization.summary + executives 서브컬렉션 동시 저장 */
export async function saveFederationOrganization(
  federationSlug: string,
  payload: FederationOrganizationPayload
): Promise<void> {
  await updateFederationAbout(federationSlug, {
    organization: { summary: payload.summary.trim() },
  });
  await replaceFederationExecutives(federationSlug, payload.executives);
}

export async function regenerateFederationOrganization(
  federationSlug: string,
  meta: { name: string; sport?: string; audience?: string }
): Promise<FederationOrganizationPayload> {
  const data = await generateFederationOrganizationOnly(meta);
  await saveFederationOrganization(federationSlug, data);
  return data;
}

/** 조직 구성(임원) 전체 교체 — AI 생성 후 사용자 수정에 사용 */
export async function replaceFederationExecutives(
  federationSlug: string,
  executives: { name: string; role: string }[]
): Promise<void> {
  const col = collection(db, "federations", federationSlug, "executives");
  const snap = await getDocs(col);
  const now = serverTimestamp();
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  executives
    .filter((e) => e.name.trim() || e.role.trim())
    .forEach((e) => {
      const exRef = doc(collection(db, "federations", federationSlug, "executives"));
      batch.set(exRef, {
        name: e.name.trim(),
        role: e.role.trim(),
        createdAt: now,
      });
    });
  await batch.commit();
}
