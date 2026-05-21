/**
 * 🔥 Story Admin Types - 관리자 최소 스키마
 */

import { StoryCategory, StorySource, StoryCtaType } from "./story.types";

// Admin 폼 데이터
export interface StoryAdminForm {
  title: string;
  subtitle: string;
  category: StoryCategory;
  source: StorySource;
  ctaType?: StoryCtaType;
  priority: number; // 0-100
  imageUrl?: string;
  
  // 노출 기간 (관리자가 지정, 기본값 7일)
  startAt?: string;  // ISO string (기본: 지금)
  endAt?: string;    // ISO string (기본: startAt + 7일)
  
  isVerifiedAuthor?: boolean; // 사용자 스토리만
  metadata?: {
    associationId?: string;
    tournamentName?: string;
    [key: string]: any;
  };
}

// Admin 업데이트 데이터
export interface StoryAdminUpdate {
  title?: string;
  subtitle?: string;
  category?: StoryCategory;
  priority?: number;
  imageUrl?: string;
  expiresAt?: number;
  status?: "published" | "hidden" | "pending";
  metadata?: {
    [key: string]: any;
  };
}

// Admin 조회 필터
export interface StoryAdminFilter {
  source?: StorySource;
  category?: StoryCategory;
  status?: "published" | "hidden" | "pending";
  limit?: number;
  offset?: number;
}
