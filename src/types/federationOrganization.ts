/**
 * 협회 홈페이지 「조직 구성」 — AI/CMS JSON → 프로필 카드 UI
 * 기존 executives `{ name, role }` 와 호환 (resolver가 확장 필드로 정규화)
 */

export type FederationOrganizationMember = {
  id: string;
  name: string;
  /** 직책 (기존 role) */
  position: string;
  /** 본부/그룹 키 (표시명과 매핑) */
  department: string;
  /** 최종 표시용 (우선순위 첫 후보). 로드 실패 시 photoSources 폴백 */
  photo?: string | null;
  /**
   * Firestore → local `/images/executives/{직책}_{이름}.*` 후보
   * 카드에서 onError로 다음 후보 → Avatar
   */
  photoSources?: string[];
  description?: string | null;
  /** 담당 업무 */
  duties?: string | null;
  order: number;
  email?: string | null;
  phone?: string | null;
  career?: string | null;
};

export type FederationOrganizationGroup = {
  id: string;
  title: string;
  order: number;
  members: FederationOrganizationMember[];
};

/** CMS / AI 가 다루는 평탄 리스트 (JSON 교체만으로 UI 갱신) */
export type FederationOrganizationContent = {
  summary?: string;
  members: FederationOrganizationMember[];
};

/** 레거시 executives 행 */
export type LegacyFederationExecutive = {
  id?: string;
  name?: string;
  role?: string;
  position?: string;
  department?: string;
  photo?: string | null;
  photoUrl?: string | null;
  description?: string | null;
  duties?: string | null;
  email?: string | null;
  phone?: string | null;
  career?: string | null;
  order?: number;
};
