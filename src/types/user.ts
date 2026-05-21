/**
 * 🔥 사용자 타입 정의 (확장)
 * 판매자 신뢰 점수 시스템 포함
 */

export interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  // 🔥 판매자 신뢰 점수 필드
  trustScore?: number; // 신뢰 점수 (0~100)
  ratingAvg?: number; // 평균 평점 (0~5)
  completedSales?: number; // 완료된 거래 수
  reviewCount?: number; // 리뷰 수
  recentPosts?: number; // 최근 게시글 수 (30일 이내)
  // 🔥 등급 (계산된 값)
  trustTier?: "guest" | "basic" | "verified" | "trusted" | "top"; // 신뢰 등급
  // 🔥 사기 의심 패턴 탐지 필드
  riskScore?: number; // 위험 점수 (0~100, default 0)
  riskFlags?: string[]; // 위험 플래그 배열 (default [])
  riskTier?: "low" | "medium" | "high"; // 위험 등급 (default "low")
  lastRiskUpdatedAt?: any; // 마지막 위험 점수 갱신 시각 (Firestore Timestamp)
}

export type TrustTier = "guest" | "basic" | "verified" | "trusted" | "top";

export interface TrustScoreConfig {
  ratingWeight: number; // 평점 가중치 (기본: 20)
  salesWeight: number; // 거래 수 가중치 (기본: 5)
  salesMax: number; // 거래 수 최대 점수 (기본: 50)
  postsWeight: number; // 게시글 수 가중치 (기본: 2)
  postsMax: number; // 게시글 수 최대 점수 (기본: 20)
}

/**
 * 🔥 Firestore users/{uid} 문서 타입 정의
 * 
 * 플랫폼 레벨 권한:
 * - role: "ADMIN" | "USER" (대문자)
 * - ADMIN: 플랫폼 책임자 / 서비스 관리자
 * - USER: 일반 사용자 (기본값)
 * 
 * 참고:
 * - 팀 권한은 teams/{teamId}/members/{uid}.role에 별도로 저장
 * - 팀 role: "owner" | "admin" | "member" (소문자)
 */
export interface UserProfile {
  id?: string; // 문서 ID (옵셔널, Firestore에서 자동 생성)
  uid?: string; // 사용자 UID
  displayName?: string;
  email?: string;
  photoURL?: string;
  phoneNumber?: string;
  role?: "ADMIN" | "USER"; // 🔥 플랫폼 레벨 권한 (대문자)
  organizationRoles?: Record<string, "super_admin" | "org_admin" | "event_manager" | "stats_manager" | "viewer">; // 🔥 Organization별 역할
  profileCompleted?: boolean;
  onboardingCompleted?: boolean;
  /** Phase 2: `avatars/{uid}` 온보딩 완료 (클라에서 배치 기록) */
  hasCompletedAvatarOnboarding?: boolean;
  status?: "active" | "deleted" | "suspended";
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  [key: string]: any; // 기타 확장 필드
}
