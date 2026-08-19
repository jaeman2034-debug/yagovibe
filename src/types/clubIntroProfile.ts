/**
 * 노원 단위축구회 소개 프로필 — 입장식 멘트 구조화 SoT
 * Firestore: teams/{platformTeamId}.aiProfile.meta.clubIntro
 */
export type ClubIntroStatus = "DRAFT" | "REVIEWED" | "PUBLISHED";

export type ClubIntroNotablePerson = {
  name: string;
  title: string;
  note?: string;
};

export type ClubIntroProfile = {
  teamName: string;
  chairmanName?: string;
  foundedYear?: number;
  foundedDate?: string;
  memberCount?: number;
  memberCountLabel?: string;
  homeGrounds?: string[];
  ageRange?: string;
  activityDay?: string;
  introSummary: string;
  teamValues?: string[];
  achievements?: string[];
  notablePeople?: ClubIntroNotablePerson[];
  /**
   * 입장식 소개 멘트 — 사용자 제공 원문 그대로.
   * AI·팩트 조립문으로 채우지 않음. 원문 미확보 시 빈 문자열(DRAFT만).
   */
  ceremonyIntroText: string;
  source: "NOWON_UNIT_CLUB_CEREMONY_SCRIPT";
  status: ClubIntroStatus;
  /** ISO string or Firestore Timestamp serialized on client */
  updatedAt?: string;
  /** 매칭 잠금 — 플랫폼 팀 id */
  platformTeamId?: string;
  federationTeamId?: string;
  sortOrder?: number;
  /**
   * AI 팀소개 초안 메타(선택). 공개 렌더에 쓰지 않음 — CMS 이력·필드 변경 감지용.
   * ClubIntro 본문 SoT와 분리된 보조 정보.
   */
  introSummaryProvenance?: {
    generatedAt: string;
    source: "openai" | "template";
    factsFingerprint: string;
    humanEditedAt?: string;
  };
};

/** 카탈로그 시드(매칭 전) — matchKeys로만 연결, 임의 생성 금지 */
export type ClubIntroCatalogEntry = Omit<ClubIntroProfile, "status" | "updatedAt" | "platformTeamId" | "federationTeamId"> & {
  /** 정규화 전 팀명 후보 (정확 매칭용) */
  matchKeys: string[];
  catalogId: string;
};
