/**
 * 생활체육 클럽 — 운영 직함·초대 role preset용 타입.
 * Firestore `teams/{id}/members/{uid}.role` 의 `owner` | `admin` | `member` 와는 별도 레이어(표시·공개 프로필·초대 확장 시).
 */
export type ClubRole =
  | "chairman"
  | "senior_vice"
  | "vice_chairman"
  | "director"
  | "coach"
  | "secretary"
  | "auditor"
  | "advisor"
  | "committee";

/** 공개 허브 운영진 직책 `<select>` + 기타 직접입력 (한글 표기 고정). 목록에 없어도 직접입력으로 표시 가능 */
export const CLUB_PUBLIC_OFFICER_TITLE_OPTIONS = [
  "회장",
  "수석 부회장",
  "부회장",
  "감독",
  "코치",
  "총무",
  "주장",
  "주장단",
  "경기담당",
  "경기부장",
  "회계",
  "매니저",
  "감사",
  "고문",
  "운영위원",
  "학부모대표",
] as const;
