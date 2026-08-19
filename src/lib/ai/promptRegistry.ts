/**
 * Priority 1-2 — AI 콘텐츠 Prompt Registry (Client mirror)
 *
 * 런타임 Generate SoT는 functions/src/lib/ai/promptRegistry.ts 이다.
 * 이 파일은 클라이언트 VOC fallback·버전 표시용이며,
 * **version 값은 Functions Registry와 반드시 동일**해야 한다.
 * Prompt 본문 수정은 Functions Registry(+ 이 mirror)와 docs/AI_PROMPT_CHANGELOG.md 를 함께 갱신한다.
 */

export type AiPromptFeatureType =
  | "clubIntro"
  | "captainMessage"
  | "recruitMessage"
  | "socialPost"
  | "eventMessage";

export type PromptRegistryEntry = {
  version: string;
  system: string;
  /** User prompt template (`{{FACTS}}` placeholder). Client는 참조용. */
  template: string;
};

const SYSTEM_KO_JSON =
  "한국어 JSON만 출력한다. 마크다운 코드펜스 금지. 제공된 사실 외 창작 금지.";

export const PROMPT_REGISTRY = {
  clubIntro: {
    version: "v1.0.0",
    system: SYSTEM_KO_JSON,
    template: `당신은 생활체육 클럽 홈페이지 소개문 작성자입니다.
아래 "제공된 사실"만 사용하세요. 목록에 없는 사실·숫자·장소·수상·연도는 절대 넣지 마세요.

금지:
- 우승/수상 이력 추가(제공되지 않은 경우)
- 회원수·창단연도·홈구장 변경 또는 추측
- "전국 최고", "대한민국 대표", "명문", "최고의", "유일무이" 등 근거 없는 과장
- 제공되지 않은 인물·대회명 추가

허용:
- 제공된 사실을 자연스러운 2~4문장 한국어로 연결
- 문장 다듬기(의미 변경 금지)

제공된 사실:
{{FACTS}}

JSON만 출력: {"introSummary": string}`,
  },

  captainMessage: {
    version: "v1.0.0",
    system: SYSTEM_KO_JSON,
    template: `당신은 생활체육 클럽 회장의 공개 인사말 초안 작성자입니다.
아래 "제공된 사실"만 사용하세요.

금지:
- 회장 개인 경력·학력·직장·수상 이력 창작
- 제공되지 않은 우승·대회·숫자·장소 추가
- 정치적·종교적 표현
- "전국 최고", "명문", "대한민국 대표" 등 근거 없는 과장
- 제공되지 않은 인물명 추가

허용:
- 회장 명의 1인칭 인사(회장명이 있으면 사용)
- 제공된 팀 정보로 환영·커뮤니티·참여 독려 2~4문장
- 문장 다듬기(의미 변경 금지)

제공된 사실:
{{FACTS}}

JSON만 출력: {"captainMessage": string}`,
  },

  recruitMessage: {
    version: "v1.0.0",
    system: SYSTEM_KO_JSON,
    template: `당신은 생활체육 클럽의 회원 모집 글 초안 작성자입니다.
아래 "제공된 사실"만 사용하세요. 목록에 없는 사실·숫자·장소·수상·혜택은 절대 넣지 마세요.

금지:
- 회원 수 추가·변경·추측
- 우승 경력·수상·유명 선수 배출 창작
- "전국 최고", "최고의 팀", "명문", "대한민국 대표" 등 근거 없는 과장 광고
- 없는 시설·없는 혜택 추가
- 제공되지 않은 연락처·장소·일정 추가

허용:
- 친근하고 자연스러운 모집 문체(2~5문장)
- 제공된 사실만으로 가입 유도
- 문장 다듬기(의미 변경 금지)
- 본문 300~500자 이내(공백 포함)

제공된 사실:
{{FACTS}}

JSON만 출력: {"recruitMessage": string}`,
  },

  socialPost: {
    version: "v1.0.0",
    system: SYSTEM_KO_JSON,
    template: `당신은 생활체육 클럽 SNS(인스타·카카오·밴드 등) 홍보문 초안 작성자입니다.
아래 "제공된 사실"만 사용하세요.

필수:
- SNS 홍보문 본문 120~250자(공백 포함), 자연스럽고 읽기 쉬운 문체
- 해시태그 3~5개를 본문 아래에 한 줄로 붙인다 (예: #팀명 #지역 #축구)
- 사실만 사용

금지:
- 우승·수상 경력 창작
- 회원 수 추가·변경·추측
- "최고의 팀", "전국 최고", "명문" 등 과장
- 없는 행사·이벤트 생성
- 허위 CTA(할인·무료체험 등 원문에 없는 약속)

제공된 사실:
{{FACTS}}

JSON만 출력: {"socialPost": string}
socialPost에는 본문과 해시태그를 모두 포함하세요.`,
  },

  eventMessage: {
    version: "v1.0.0",
    system: SYSTEM_KO_JSON,
    template: `당신은 생활체육 클럽의 행사 안내·사회자 오프닝 소개 멘트 초안 작성자입니다.
아래 "제공된 사실"만 사용하세요.

필수:
- 행사 안내 또는 오프닝 소개 멘트, 150~300자(공백 포함)
- 자연스러운 안내 문체

금지:
- 제공되지 않은 행사명·일정·장소 창작
- 우승·수상 경력 창작
- "최고의", "전국 최고" 등 과장
- 허위 이벤트·프로그램 생성
- 회원 수 추측·변경

제공된 사실:
{{FACTS}}

JSON만 출력: {"eventMessage": string}`,
  },
} as const satisfies Record<AiPromptFeatureType, PromptRegistryEntry>;

/** VOC fallback — Registry.version */
export const AI_CONTENT_PROMPT_VERSION = {
  clubIntro: PROMPT_REGISTRY.clubIntro.version,
  captainMessage: PROMPT_REGISTRY.captainMessage.version,
  recruitMessage: PROMPT_REGISTRY.recruitMessage.version,
  socialPost: PROMPT_REGISTRY.socialPost.version,
  eventMessage: PROMPT_REGISTRY.eventMessage.version,
} as const;

export type AiContentFeatureType = keyof typeof AI_CONTENT_PROMPT_VERSION;

export type AiFeedbackRating = "good" | "needs_edit";
