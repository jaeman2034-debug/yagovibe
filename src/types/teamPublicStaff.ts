/**
 * 공개 팀 허브 — 운영진(회장 외) 브랜딩 전용. members 권한과 무관하게 `aiProfile.meta.publicStaff`에 저장.
 * (구버전 `meta.teamPublicStaff`는 읽기 시에만 호환)
 */
export type TeamPublicStaffMember = {
  id: string;
  name: string;
  /** 자유 표기: 수석 부회장, 감독, 총무 등 */
  title: string;
  intro?: string;
  photoUrl?: string;
  visible: boolean;
  order: number;
};
