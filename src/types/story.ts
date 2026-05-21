/**
 * 🔥 스토리 존 데이터 타입 정의 (혼합 C 정책)
 * 
 * 목적:
 * - 지역 축구 감성/커뮤니티 체류 ↑
 * - 팀/경기/대회로 자연 유도(CTA)
 * - 운영팀 큐레이션으로 품질 보장
 * 
 * 원칙:
 * - 사용자 업로드는 pending(검수 후 publish)로 시작
 * - 운영팀 픽 우선 노출
 * - 최대 5개 슬라이드
 */

import { Timestamp } from "firebase/firestore";

// ============================================================================
// 타입 정의
// ============================================================================

/**
 * 스토리 미디어 타입
 */
export type StoryType = "image" | "video";

/**
 * 스토리 소스
 */
export type StorySource = "ops" | "user";

/**
 * 스토리 CTA 타입
 */
export type StoryCTA = "teams" | "match_today" | "market" | "venues" | "my_team" | "external";

/**
 * 스토리 상태
 */
export type StoryStatus = "published" | "hidden" | "pending";

// ============================================================================
// 인터페이스 정의
// ============================================================================

/**
 * 스토리 존 스토리 (메인 허브용)
 * 
 * 컬렉션: stories/{storyId}
 */
export interface Story {
  id: string;
  sport: "soccer"; // 종목 확장 대비
  region?: string; // 지역 필터 (예: nowon)
  source: StorySource; // ops/user
  type: StoryType; // image/video

  mediaUrl: string; // 이미지/영상 url
  posterUrl?: string; // 영상 썸네일
  title: string; // 14~18자 권장
  subtitle?: string; // 24자 이내

  cta: {
    type: StoryCTA; // 고정 CTA 2개 중 하나만
    label: string;
    target?: string; // 라우트 id (/teams?region=)
  };

  stats: {
    views: number;
    likes: number;
  };

  status: StoryStatus; // user는 pending 가능
  expiresAt: number; // 만료 (Timestamp seconds)
  createdAt: number; // Timestamp seconds
  createdBy: string; // uid or ops

  // 하위 호환성 (기존 Story 타입)
  personId?: string;
  personName?: string;
  associationId?: string;
  tournamentId?: string;
  clubId?: string;
  description?: string;
  verified?: boolean;
  metadata?: {
    tournamentName?: string;
    role?: string;
    clubName?: string;
    contributionType?: string;
    [key: string]: any;
  };
}
