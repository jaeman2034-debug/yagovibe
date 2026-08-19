import { teamAiAnalysisLitePath } from "@/lib/team/teamAiAnalysisLite";
import { extractYoutubeVideoId, youtubeEmbedUrl } from "@/lib/youtube/extractYoutubeVideoId";

/** 특허 출원번호 (공개 데모 Hero) */
export const GROWTH_PATENT_APPLICATION_NO = "10-2026-0103289";

/** 3분 시연 영상 — `VITE_GROWTH_DEMO_YOUTUBE_URL` 설정 시 embed */
export const GROWTH_DEMO_YOUTUBE_URL =
  (import.meta.env.VITE_GROWTH_DEMO_YOUTUBE_URL as string | undefined)?.trim() || "";

export function growthDemoYoutubeVideoId(): string | null {
  if (!GROWTH_DEMO_YOUTUBE_URL) return null;
  return extractYoutubeVideoId(GROWTH_DEMO_YOUTUBE_URL);
}

export function growthDemoYoutubeEmbedUrl(): string | null {
  const id = growthDemoYoutubeVideoId();
  if (!id) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : undefined;
  return youtubeEmbedUrl(id, origin);
}

/** 공개 샘플 PDF (`public/growth/`) */
export const GROWTH_SAMPLE_PDF_PATH = "/growth/YAGO-Growth-Report-Sample.pdf";
export const GROWTH_SAMPLE_PDF_FILENAME = "YAGO-Growth-Report-Sample.pdf";

/** YAGO Growth Validation 파이프라인 (공개 설명용) */
export const GROWTH_VALIDATION_PIPELINE_STEPS = [
  { step: 1, label: "영상 분석", detail: "MP4 · YouTube URL 업로드" },
  { step: 2, label: "Whisper STT", detail: "자막·전사 세그먼트 생성" },
  { step: 3, label: "AI 태깅", detail: "성장 이벤트 자동 추출" },
  { step: 4, label: "코치 검증", detail: "Coach-verified evidence" },
  { step: 5, label: "FII 리포트", detail: "Growth Score · PDF" },
] as const;

/** 생활체육 AI Analysis Lite 데모 teamId */
export const GROWTH_LITE_DEMO_TEAM_ID =
  (import.meta.env.VITE_GROWTH_LITE_DEMO_TEAM_ID as string | undefined)?.trim() ||
  (import.meta.env.VITE_GROWTH_DEMO_TEAM_ID as string | undefined)?.trim() ||
  "VojZWvNb0n1kzOBDlr5n";

/** YAGO Growth Validation (아카데미 FII 파이프라인) 데모 teamId */
export const GROWTH_ACADEMY_DEMO_TEAM_ID =
  (import.meta.env.VITE_GROWTH_ACADEMY_DEMO_TEAM_ID as string | undefined)?.trim() ||
  "k2rMRxPqX0XydHSfoHoS";

/** @deprecated — use GROWTH_LITE_DEMO_TEAM_ID */
export const GROWTH_DEMO_TEAM_ID = GROWTH_LITE_DEMO_TEAM_ID;

export const GROWTH_VALIDATION_DEMO_PATH = "/growth/demo";

export function growthValidationDemoPath(): string {
  return GROWTH_VALIDATION_DEMO_PATH;
}

export function growthLiteDemoPath(): string {
  return teamAiAnalysisLitePath(GROWTH_LITE_DEMO_TEAM_ID);
}

/** @deprecated — use growthLiteDemoPath */
export function growthDemoAnalysisPath(): string {
  return growthLiteDemoPath();
}

export function growthValidationDemoLoginPath(): string {
  return `/login?next=${encodeURIComponent(growthValidationDemoPath())}`;
}

export function growthLiteDemoLoginPath(): string {
  return `/login?next=${encodeURIComponent(growthLiteDemoPath())}`;
}

/** @deprecated — use growthLiteDemoLoginPath */
export function growthDemoLoginPath(): string {
  return growthLiteDemoLoginPath();
}

/** Football Intelligence Index — 공개 데모 5축 */
export const FII_DIMENSIONS = [
  { key: "spatial", label: "공간 인식", score: 82, description: "포지셔닝·공간 활용" },
  { key: "vision", label: "시야", score: 74, description: "주변 상황 파악·시선 전환" },
  { key: "decision", label: "의사결정", score: 79, description: "패스·돌파 선택" },
  { key: "pressure", label: "압박 대응", score: 71, description: "볼 소유 시 압박 처리" },
  { key: "tactics", label: "전술 이해도", score: 78, description: "팀 전술·역할 수행" },
] as const;

export const FII_OVERALL_SCORE = 77;

/** 샘플 성장 추세 (월별 FII) */
export const FII_TREND_SAMPLE = [
  { month: "1월", score: 62 },
  { month: "2월", score: 65 },
  { month: "3월", score: 68 },
  { month: "4월", score: 72 },
  { month: "5월", score: 75 },
  { month: "6월", score: 77 },
];

export const PLATFORM_FEATURES = [
  { title: "AI 영상 분석", description: "경기·훈련 영상에서 선수 행동을 자동 추출합니다." },
  { title: "AI 익명화", description: "개인정보 보호를 위한 영상·데이터 익명 처리." },
  { title: "성장 리포트", description: "FII 기반 월간·시즌 성장 리포트 PDF." },
  { title: "아바타 성장", description: "분석 결과가 플레이어 아바타·OVR에 반영됩니다." },
  { title: "AI 전술 에이전트", description: "팀 전술·선수 역할에 맞춘 AI 코칭 인사이트." },
] as const;
