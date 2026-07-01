import type { MockGrowthEvent, TranscriptSegment } from "@/components/ai-growth/types";

/** Step1 기본 선택 — STT E2E 검증용 짧은 영어 클립 (~19s) */
export const MOCK_YOUTUBE_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

export type DemoIngestMode = "coach_sample" | "youtube_only";

export type MockVideoOption = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  videoId: string;
  /** UI 안내용 — Whisper는 음성 언어를 그대로 전사 */
  languageHint?: "ko" | "en" | "any";
  /** 긴 영상 — 동기 Callable timeout 주의 */
  longForm?: boolean;
  /**
   * coach_sample — 심사·데모용: yt-dlp 없이 코치 전사 샘플 → Step 2
   * youtube_only — URL + Callable/yt-dlp (개발·E2E)
   */
  demoIngest?: DemoIngestMode;
  /** coach_sample 카드 전용 전사 (미지정 시 MOCK_TRANSCRIPT_SEGMENTS) */
  demoTranscriptSegments?: TranscriptSegment[];
};

export const MOCK_VIDEO_OPTIONS: MockVideoOption[] = [
  {
    id: "video-e2e-en",
    title: "STT 검증 — Me at the zoo",
    subtitle: "영어 음성 · 19초 · URL E2E (개발용)",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    videoId: "jNQXAC9IVRw",
    languageHint: "en",
    demoIngest: "youtube_only",
  },
  {
    id: "video-1",
    title: "유소년 훈련 #1 (실전)",
    subtitle: "한국어 코치 · 심사용 샘플 · 원클릭 분석",
    url: "https://www.youtube.com/watch?v=RhjpHnp3SRA",
    videoId: "RhjpHnp3SRA",
    languageHint: "ko",
    demoIngest: "coach_sample",
  },
  {
    id: "video-2",
    title: "화랑대기 U-12",
    subtitle: "한국어 코치 · 심사용 샘플",
    url: "https://www.youtube.com/watch?v=hwgzZduJs9U",
    videoId: "hwgzZduJs9U",
    languageHint: "ko",
    demoIngest: "coach_sample",
  },
  {
    id: "video-3",
    title: "권능축구 클럽",
    subtitle: "한국어 코치 · 심사용 샘플",
    url: "https://www.youtube.com/watch?v=xxEaquC5pOs",
    videoId: "xxEaquC5pOs",
    languageHint: "ko",
    demoIngest: "coach_sample",
  },
];

export function isCoachSampleDemoOption(option: MockVideoOption | undefined): boolean {
  return option?.demoIngest === "coach_sample";
}

export const MOCK_TRANSCRIPT_LINES = [
  { time: "08:22", text: "주변 보고 패스!", suggested: "SCAN" },
  { time: "12:05", text: "압박 잘 버텼다!", suggested: "PRESS_RESIST" },
  { time: "17:40", text: "실수했어도 바로 따라가!", suggested: "QUICK_RECOVERY" },
];

export const MOCK_TRANSCRIPT_SEGMENTS: TranscriptSegment[] = [
  { id: "seg-1", start: 8, end: 12, text: "좋아, 주변 보고 패스해봐", speaker: "coach" },
  { id: "seg-2", start: 22, end: 28, text: "압박 잘 버텼다, 바로 연결!", speaker: "coach" },
  { id: "seg-3", start: 65, end: 70, text: "실수해도 바로 따라가, 리커버리!", speaker: "coach" },
];

export const MOCK_GROWTH_EVENTS: MockGrowthEvent[] = [
  {
    id: "ev-1",
    eventType: "SCAN",
    timestampStart: 42.1,
    timestampEnd: 44.3,
    transcriptStart: 8,
    transcriptEnd: 12,
    evidence: "좋아, 주변 보고 패스해봐",
    confidence: "MEDIUM",
    reviewStatus: "candidate",
    guardianPhrase: "공을 받기 전 주변을 확인하는 모습이 점점 자연스러워지고 있어요.",
    coachNote: "첫 터치 전 어깨 체크 확인",
  },
  {
    id: "ev-2",
    eventType: "PRESS_RESIST",
    timestampStart: 125.0,
    timestampEnd: 128.5,
    transcriptStart: 22,
    transcriptEnd: 28,
    evidence: "압박 잘 버텼다, 바로 연결!",
    confidence: "MEDIUM",
    reviewStatus: "candidate",
    guardianPhrase: "상대가 붙어도 침착하게 공을 지키거나 팀으로 연결하는 모습이 좋아요.",
  },
  {
    id: "ev-3",
    eventType: "QUICK_RECOVERY",
    timestampStart: 201.2,
    transcriptStart: 65,
    transcriptEnd: 70,
    evidence: "실수해도 바로 따라가, 리커버리!",
    confidence: "HIGH",
    reviewStatus: "confirmed",
    guardianPhrase: "실수 후에도 바로 다음 플레이에 집중하는 모습이 성장하고 있어요.",
    coachNote: "리플레이로 코치 확인 완료",
  },
];

export const AMBIGUOUS_ZONE_EXAMPLES = [
  { pair: "SCAN ↔ BODY_ORIENTATION", note: "받기 전 시선 확인 vs 받기 전 몸 방향 열기" },
  { pair: "PRESS_RESIST ↔ COMPOSURE", note: "압박 탈출 결과 vs 침착한 기술 수행" },
  { pair: "COMMUNICATION ↔ (informal leadership)", note: "v1에서는 COMMUNICATION으로만 기록 (LEADERSHIP 미사용)" },
];

export const IMPLEMENTATION_GAP_ROWS = [
  { label: "성장 이벤트 어휘 v1", designed: true, implemented: false },
  { label: "학부모 문구(Appendix A)", designed: true, implemented: false },
  { label: "신뢰 아키텍처", designed: true, implemented: false },
  { label: "검증 방법론", designed: true, implemented: false },
  { label: "aiCoach.ts (growth)", designed: false, implemented: false },
  { label: "Whisper 연동", designed: true, implemented: false },
  { label: "Firestore 성장 스키마", designed: true, implemented: false },
  { label: "자동 태깅", designed: false, implemented: false },
  { label: "CV / Vision 파이프라인", designed: true, implemented: false },
  { label: "학부모 자동 게시", designed: false, implemented: false },
];
