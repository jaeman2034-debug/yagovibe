/**
 * 협회 소개 — AI 생성 + 수동 수정 필드
 */

export type FederationPresident = {
  name: string;
  message: string;
  /** 협회장 사진(선택) */
  photoUrl?: string;
};

/** federations.organization — 조직 운영 개요(AI·수정). 임원 명단은 executives 서브컬렉션 */
export type FederationOrganizationDoc = {
  summary?: string;
};

/** 이미지 AI 패키지에서 사용자가 확정(또는 자동 적용)된 variant 메타 — Draft에 저장 */
export type FederationImageContentAppliedTo =
  | "association_intro"
  | "association_activities"
  | "dynamic_section";

export type FederationImageContentSelectionRow = {
  imageId: string;
  imageUrl: string;
  imageSectionKey: string;
  /** dynamic_section 일 때 텍스트 섹션 키 */
  targetSectionKey: string | null;
  selectedVariantIndex: number;
  selectedTone: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  recommendedUse: string;
  appliedTo: FederationImageContentAppliedTo;
  /** 사용자가 모달/섹션 편집으로 덮어쓴 경우 true — 자동 AI 덮어쓰기 방지 */
  isUserEdited?: boolean;
  /** ISO 8601 — 마지막 사용자 수정 시각 */
  editedAt?: string;
};

/** Firestore federations 문서의 소개 관련 필드 */
export type FederationAboutFields = {
  /** 협회장 인사말 본문(보통 2~3문단). `president.message`와 동일하게 유지 */
  introMessage?: string;
  history?: string;
  vision?: string;
  activities?: string[];
  /** 협회장 사진 URL(선택) — UI에서 좌측 사진에 사용 */
  chairpersonPhotoUrl?: string;
  /** 신규: 협회장 이름·인사말 (기존 presidentName과 병행 가능) */
  president?: FederationPresident;
  presidentName?: string;
  organization?: FederationOrganizationDoc;
  /** 협회 소개 탭 섹션 순서 (페이지 빌더 핵심) */
  sectionOrder?: Array<"intro" | "history" | "vision" | "activities" | "organization">;
  /** 동적 섹션 블록(텍스트/이미지/갤러리 등) */
  sections?: Record<
    string,
    {
      type: "text" | "image" | "gallery";
      content: string;
      draft?: string | null;
      image?: string;
      /** AI 패키지에서 채운 메타 (선택) */
      aiTitle?: string;
      aiSummary?: string;
      aiTags?: string[];
    }
  >;
  /** 이미지 섹션 키 → 마지막으로 적용된 AI variant 요약 (새로고침 후 복원·추적) */
  imageContentSelections?: Record<string, FederationImageContentSelectionRow>;
};
