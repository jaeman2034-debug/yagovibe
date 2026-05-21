/**
 * 🔥 Association Types - 협회 원본 모델
 * 
 * 협회 API에서 받는 원본 데이터 구조
 */

/**
 * 협회 대회
 */
export type AssocLeague = {
  id: string;
  name: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  region: string;
  status?: "upcoming" | "active" | "ended";
};

/**
 * 협회 공지
 */
export type AssocNotice = {
  id: string;
  title: string;
  content: string;
  publishedAt: string; // ISO string
  category?: string;
};

/**
 * 협회 모집
 */
export type AssocRecruitment = {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO string
  region: string;
};
