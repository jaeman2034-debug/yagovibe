/**
 * 🔥 Story Domain Types - 모델 잠금
 */

import type { Region } from "./region.types";

export type StorySource = "운영" | "협회" | "사용자";
export type StoryCategory = "대회" | "모집" | "협회" | "마켓" | "구장";

export type StoryCtaType =
  | "view_schedule"
  | "find_team"
  | "view_notice"
  | "browse_market"
  | "book_ground";

export type StoryStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "REJECTED" | "EXPIRED";

export type Story = {
  id: string;
  region: Region;      // 핵심 추가: 지역 멀티 허브
  source: StorySource;
  category: StoryCategory;

  title: string;    // <= 40
  subtitle: string; // <= 60

  status: StoryStatus;

  // 노출 기간 정책 (ISO string)
  startAt: string;  // 기본: 지금
  endAt: string;    // 기본: startAt + 7일

  imageUrl?: string;

  // D혼합 운영을 위한 핵심 필드
  ctaType?: StoryCtaType;         // 없으면 category로 자동 매핑
  priority?: number;              // 운영/협회/사용자 내부 우선순위 (높을수록 우선)
  score?: number;                 // 사용자 인기(좋아요/조회 기반) 등
  isVerifiedAuthor?: boolean;     // 사용자 검증 여부

  createdAt: string;
  updatedAt: string;
};
