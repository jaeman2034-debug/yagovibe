/**
 * 공개 팀 홈 — 회장 인사말 (aiProfile v2 meta + generated/edited)
 * 필드는 모두 optional. 레거시 팀과 충돌 없음.
 */

/** Firestore `teams.aiProfile` v2에 저장할 때 권장 위치 (generated/edited/meta) */
export type TeamCaptainAiFields = {
  /** 본문 인사·팀 운영 철학 (여러 문단 가능) */
  captainMessage?: string;
};

/** 표시용 메타 — meta 권장 (AI 재생성 시 generated와 분리) */
export type TeamCaptainDisplayMeta = {
  captainNickname?: string;
  /** 예: "회장", "감독", "총무" */
  captainRole?: string;
  captainPhotoUrl?: string;
};

/** UI 한 덩어리 — 회장 신뢰 카드(단일 인물). `tagline`은 레거시·호환용(신뢰 카드에서는 사용하지 않음). */
export type TeamCaptainPublicView = {
  message: string;
  nickname: string;
  roleLabel: string;
  photoUrl: string | null;
  /** 슬로건 등 분위기 보조 한 줄 (본문과 중복 시 생략) */
  tagline?: string;
};
