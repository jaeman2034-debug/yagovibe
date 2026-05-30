/**
 * AI Analysis Lite MVP v1 — FROZEN 2026-05-29
 * Phase 2: Whisper (S9) → GPT (S10) → Firestore (S11). See docs/YAGO_TEAM_AI_ANALYSIS_LITE.md
 */
export const TEAM_AI_ANALYSIS_LITE_MVP_VERSION = "v1" as const;

/** Team home segment tab + route id for 생활체육 AI 분석 Lite */
export const TEAM_AI_ANALYSIS_LITE_TAB = "ai-analysis" as const;

export type TeamAiAnalysisLiteTab = typeof TEAM_AI_ANALYSIS_LITE_TAB;

export function teamAiAnalysisLitePath(teamId: string): string {
  return `/team/${encodeURIComponent(teamId)}/ai-analysis`;
}

export function teamAiAnalysisLiteTabQuery(teamId: string): string {
  return `/team/${encodeURIComponent(teamId)}?tab=${TEAM_AI_ANALYSIS_LITE_TAB}`;
}

const YOUTUBE_ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

/** Sprint 6 — YouTube URL만 허용 (Whisper 연동 전 클라이언트 검증) */
export function isValidYoutubeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return YOUTUBE_ALLOWED_HOSTS.has(host);
  } catch {
    return false;
  }
}

/** Sprint 7 — 최근 분석 기록 (localStorage, Firestore 전 단계) */
export const YAGO_AI_ANALYSIS_HISTORY_STORAGE_KEY = "yago-ai-analysis-history";

export const YAGO_AI_ANALYSIS_HISTORY_MAX = 5;

export type AnalysisHistoryItem = {
  date: string;
  playerName: string;
  grade: string;
};

export function formatAnalysisHistoryDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isAnalysisHistoryItem(value: unknown): value is AnalysisHistoryItem {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.date === "string" &&
    typeof row.playerName === "string" &&
    typeof row.grade === "string"
  );
}

export function readAnalysisHistoryFromStorage(): AnalysisHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(YAGO_AI_ANALYSIS_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAnalysisHistoryItem);
  } catch {
    return [];
  }
}

/** 신규 항목을 맨 앞에 넣고 최대 5건 유지 후 localStorage 저장 */
export function appendAnalysisHistoryItem(item: AnalysisHistoryItem): AnalysisHistoryItem[] {
  const next = [item, ...readAnalysisHistoryFromStorage()].slice(
    0,
    YAGO_AI_ANALYSIS_HISTORY_MAX,
  );

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        YAGO_AI_ANALYSIS_HISTORY_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch {
      // private mode / quota — 메모리 상태만 갱신
    }
  }

  return next;
}

/** Sprint 8A — 영상 미리보기 UI (Sprint 8B YouTube Data API 연동 전) */
export type TeamAiAnalysisLiteVideoPreview = {
  title: string;
  channelName: string;
  thumbnailPlaceholder: string;
};

export const DUMMY_TEAM_AI_ANALYSIS_VIDEO_PREVIEW: TeamAiAnalysisLiteVideoPreview =
  {
    title: "2026 경기 하이라이트",
    channelName: "YAGO SPORTS",
    thumbnailPlaceholder: "placeholder",
  };

/** Sprint 8C — 더미 리포트 등급 풀 (GPT 연동 전) */
export const LITE_REPORT_GRADE_POOL = ["A+", "A", "A-", "B+", "B"] as const;

export type LiteReportGrade = (typeof LITE_REPORT_GRADE_POOL)[number];

export const LITE_REPORT_DIMENSION_ROWS = [
  { key: "attack", label: "공격 기여도" },
  { key: "defense", label: "수비 기여도" },
  { key: "activity", label: "활동량" },
  { key: "teamPlay", label: "팀 플레이" },
  { key: "participation", label: "참여도" },
] as const;

export type LiteReportDimensionKey = (typeof LITE_REPORT_DIMENSION_ROWS)[number]["key"];

export type LiteReportSnapshot = Record<LiteReportDimensionKey, LiteReportGrade> & {
  overall: LiteReportGrade;
  comment: string;
  /** Sprint 8G — 성장 제안 1~2개 (GPT 연동 전) */
  growthSuggestions: string[];
};

/** Sprint 8F — 레이더 차트 축 라벨 */
export const LITE_REPORT_RADAR_AXIS_LABELS: Record<LiteReportDimensionKey, string> = {
  attack: "공격",
  defense: "수비",
  activity: "활동량",
  teamPlay: "팀플레이",
  participation: "참여도",
};

/** Sprint 8E — 등급별 Badge 색상 (Tailwind) */
export const LITE_REPORT_GRADE_BADGE_CLASS: Record<LiteReportGrade, string> = {
  "A+": "border-emerald-600 bg-emerald-600 text-white",
  A: "border-emerald-500 bg-emerald-500 text-white",
  "A-": "border-emerald-300 bg-emerald-100 text-emerald-900",
  "B+": "border-blue-500 bg-blue-500 text-white",
  B: "border-gray-300 bg-gray-100 text-gray-700",
};

export function getLiteReportGradeBadgeClassName(grade: LiteReportGrade): string {
  return LITE_REPORT_GRADE_BADGE_CLASS[grade];
}

export function isLiteReportGrade(value: string): value is LiteReportGrade {
  return (LITE_REPORT_GRADE_POOL as readonly string[]).includes(value);
}

/** 등급 → 레이더 차트 점수 (0–100) */
export function liteReportGradeToChartScore(grade: LiteReportGrade): number {
  const scores: Record<LiteReportGrade, number> = {
    "A+": 95,
    A: 85,
    "A-": 75,
    "B+": 65,
    B: 55,
  };
  return scores[grade];
}

/** Sprint 8D — 더미 AI 코멘트 (GPT 연동 전) */
export const LITE_AI_COMMENT_POOL = [
  "활동량이 우수합니다.",
  "수비 전환 속도가 좋습니다.",
  "패스 선택 정확도를 높이면 더 좋은 평가를 받을 수 있습니다.",
  "공격 포지셔닝이 안정적입니다.",
  "팀 플레이 참여도가 높습니다.",
  "볼 소유 시 압박 대응이 좋습니다.",
  "전방 침투 타이밍을 조금 더 맞추면 A 등급도 가능합니다.",
  "경기 내내 집중력을 유지했습니다.",
] as const;

export function pickRandomLiteReportGrade(): LiteReportGrade {
  const index = Math.floor(Math.random() * LITE_REPORT_GRADE_POOL.length);
  return LITE_REPORT_GRADE_POOL[index] ?? "B";
}

export function pickRandomLiteAiComment(): string {
  const index = Math.floor(Math.random() * LITE_AI_COMMENT_POOL.length);
  return LITE_AI_COMMENT_POOL[index] ?? LITE_AI_COMMENT_POOL[0];
}

/** Sprint 8G — 더미 성장 제안 (GPT 연동 전) */
export const LITE_GROWTH_SUGGESTION_POOL = [
  "패스 성공률 향상",
  "수비 전환 훈련",
  "포지셔닝 개선",
  "슈팅 정확도 연습",
  "볼 컨트롤 강화",
  "전방 압박 타이밍 조절",
  "측면 크로스 활용",
  "체력·집중력 유지 훈련",
] as const;

export function pickRandomLiteGrowthSuggestions(): string[] {
  const count = Math.random() < 0.5 ? 1 : 2;
  const shuffled = [...LITE_GROWTH_SUGGESTION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** 분석 1회당 랜덤 등급·코멘트 스냅샷 (Sprint 10 GPT로 교체 예정) */
export function generateRandomLiteReportSnapshot(): LiteReportSnapshot {
  return {
    attack: pickRandomLiteReportGrade(),
    defense: pickRandomLiteReportGrade(),
    activity: pickRandomLiteReportGrade(),
    teamPlay: pickRandomLiteReportGrade(),
    participation: pickRandomLiteReportGrade(),
    overall: pickRandomLiteReportGrade(),
    comment: pickRandomLiteAiComment(),
    growthSuggestions: pickRandomLiteGrowthSuggestions(),
  };
}
