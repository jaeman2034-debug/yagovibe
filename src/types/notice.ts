/**
 * 공지 데이터 타입 정의
 * 
 * 원칙:
 * - 협회 공지 시스템의 표준 타입
 * - 공식 기준 여부 명시
 */

import { Timestamp } from "firebase/firestore";

export type NoticeLevel = "important" | "normal";
// 🔥 게시 요청 → 승인 워크플로우 상태
export type NoticeStatus = "draft" | "pending" | "published" | "rejected" | "scheduled" | "expired" | "archived" | "closed"; // 레거시 호환
export type NoticeLabel = "필독" | "변경" | "대회";
export type NoticeVisibility = "public" | "member" | "admin"; // 노출 범위

export interface Notice {
  id: string;
  title: string;
  content: string;
  summary?: string; // 요약 (카드용)
  status: NoticeStatus;
  publishAt?: Timestamp; // 레거시 호환용
  endAt?: Timestamp; // 레거시 호환용
  visibleFrom?: Timestamp; // 노출 시작 (쿼리용, null이면 FAR_PAST)
  visibleUntil?: Timestamp; // 노출 종료 (쿼리용, null이면 FAR_FUTURE)
  isVisible?: boolean; // 노출 상태 (서버 자동 관리)
  isPinned: boolean;
  pinnedAt?: Timestamp; // 상단 고정 시각 (SuperAdmin만 변경 가능)
  pinnedBy?: string; // 상단 고정한 사용자 uid (SuperAdmin만 변경 가능)
  label?: NoticeLabel;
  level?: NoticeLevel; // 중요도 (기본값: normal)
  isOfficial?: boolean; // 공식 기준 여부 (기본값: true)
  visibility?: NoticeVisibility; // 노출 범위 (기본값: public)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // 🔥 게시 요청 → 승인 워크플로우 필드
  createdBy?: string; // 작성자 uid
  requestedAt?: Timestamp; // 게시 요청 시각
  approvedAt?: Timestamp; // 승인 시각
  approvedBy?: string; // 승인자 uid
  rejectedAt?: Timestamp; // 반려 시각
  rejectedBy?: string; // 반려자 uid
  rejectReason?: string; // 반려 사유
  
  // 🔥 게시 예약 필드
  scheduledAt?: Timestamp; // 예약 게시 시각
  publishedAt?: Timestamp; // 실제 게시 시각
  
  // 🔥 공지 만료 필드
  expiresAt?: Timestamp; // 만료 예정 시각 (없으면 영구 공지)
  expiredAt?: Timestamp; // 실제 만료 시각 (시스템 자동 설정)
  
  // 🔥 공지 통계 필드
  viewCount?: number; // 조회수 (기본값: 0)
  clickCount?: number; // 클릭수 (첨부/링크 클릭, 기본값: 0)
  lastViewedAt?: Timestamp; // 마지막 조회 시각
  
  // 🔥 참가비 정책 (구조화된 데이터 - AI/계산/FAQ 공통 사용)
  feePolicy?: {
    baseFee: number; // 기본 참가비
    baseTeamCount: number; // 기본 포함 팀 수 (1~baseTeamCount)
    extraFeePerTeam: number; // 추가 팀당 금액
  };
  
  // 🔥 시스템 자동 생성 공지 (대회 이벤트 로그)
  isSystemGenerated?: boolean; // 시스템 자동 생성 여부 (기본값: false)
  systemEventType?: "TOURNAMENT_CREATED" | "REGISTRATION_STARTED" | "REGISTRATION_ENDED" | "DRAW_EXECUTED" | "TOURNAMENT_ENDED"; // 시스템 이벤트 유형
  relatedTournamentId?: string; // 관련 대회 ID
}

