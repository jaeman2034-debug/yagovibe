/**
 * 🔥 Team Activity 타입 정의
 * 
 * 팀 활동 피드 시스템의 타입 정의
 */

import { Timestamp } from "firebase/firestore";

/**
 * Activity 타입
 */
export type TeamActivityType =
  | "event"           // 이벤트 생성
  | "notice"          // 공지 작성
  | "match"           // 경기 생성/결과 등록
  | "member_join"     // 멤버 가입
  | "member_left"     // 멤버 탈퇴
  | "post";           // 게시글 작성 (향후 확장)

/**
 * Activity 메타데이터
 */
export interface TeamActivityMetadata {
  eventDate?: Timestamp;
  matchScore?: string;
  memberName?: string;
  location?: string;
}

/**
 * Team Activity 인터페이스
 */
export interface TeamActivity {
  id: string;
  type: TeamActivityType;
  title: string;
  createdBy: string;
  createdAt: Timestamp;
  referenceId: string; // 이벤트/공지/경기 ID
  summary?: string; // 선택적 요약
  metadata?: TeamActivityMetadata;
}

/* =====================
   커뮤니티 피드 activities (루트 컬렉션, v1)
===================== */

export type ActivityType =
  | "team_created"
  | "team_notice"
  | "team_event"
  | "market_created"
  | "recruit_created"
  | "match_created"
  | "match_join_requested"
  | "match_confirmed"
  | "equipment_created";

export type ActivityRefType =
  | "teams"
  | "notices"
  | "events"
  | "market"
  | "recruit"
  | "match"
  | "equipment";

/** 원본 문서가 있는 컬렉션(삭제·동기화 쿼리용, refType과 1:1) */
export type ActivityRefCollection =
  | "matches"
  | "market"
  | "events"
  | "teams"
  | "notices"
  | "recruit"
  | "equipment";

/** `activities/{id}` 문서 (피드·ActivityCard 공통) */
export interface Activity {
  id: string;
  type: ActivityType;
  refType: ActivityRefType;
  refId: string;
  /** 원본 엔티티 구분 (refId + refCollection 으로 정리/삭제) */
  refCollection?: ActivityRefCollection;
  authorId: string;
  /** 피드 카드·목록에서 조인 없이 표시 (선택) */
  authorName?: string;
  authorPhotoUrl?: string;
  teamId?: string;
  /** 팀명 스냅샷 (선택) */
  teamName?: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  visibility: "public" | "team" | "private";
  likeCount: number;
  commentCount: number;
  /** 네거티브 피드백 집계 (CF increment) */
  feedbackReportCount?: number;
  feedbackHideCount?: number;
  feedbackNotInterestedCount?: number;
  createdAt?: Timestamp | { seconds: number; nanoseconds: number };
  /** serverTimestamp 적용 전·정렬 보조용 (클라 UI fallback) */
  createdAtMillis?: number;
  /**
   * 글로벌 허브 정렬용 (선호 종목·거리 제외). `createActivity`·CF에서 갱신.
   * @see `computeActivityHubScoreStored` in `@/utils/activityHubScore`
   */
  hubScore?: number;
  hubScoreUpdatedAt?: Timestamp;
  sport?: string;
  category?: string;
  address?: string;
  sourceId?: string;
  sourceType?: string;
  postId?: string;
  price?: number;
}
