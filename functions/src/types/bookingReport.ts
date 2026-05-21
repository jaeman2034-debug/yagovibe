/**
 * Booking Report Types
 * 대관 리포트 스키마 정의
 */

import { Timestamp } from "firebase-admin/firestore";

/**
 * 팀 유형별 집계
 */
export interface TeamTypeStats {
  /** 회원팀 */
  MEMBER: {
    total: number;
    confirmed: number;
    pending: number;
    waitlist: number;
  };
  /** 비회원팀 */
  NON_MEMBER: {
    total: number;
    waitlist: number;
    viewOnly: number;
  };
  /** 아카데미 */
  ACADEMY: {
    total: number;
    requested: number;
    confirmed: number;
  };
}

/**
 * 시설별 우선권 사용률
 */
export interface FacilityPriorityStats {
  facilityId: string;
  facilityName: string;
  accessPolicy: "ASSOCIATION_PRIORITY" | "ASSOCIATION_MANAGED" | "PUBLIC_OPEN";
  totalBookings: number;
  memberBookings: number;
  academyBookings: number;
  nonMemberBookings: number;
  priorityUsageRate: number; // 회원팀 사용률 (%)
}

/**
 * 전환 트리거 통계
 */
export interface ConversionTriggerStats {
  totalTriggers: number; // showConversionCTA 클릭 수
  conversions: {
    requested: number;
    approved: number;
    pending: number;
  };
  conversionRate: number; // 승인률 (%)
}

/**
 * 기간별 리포트 파라미터
 */
export interface BookingReportParams {
  associationId: string;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
}

/**
 * 리포트 결과
 */
export interface BookingReportResult {
  /** 리포트 ID */
  reportId: string;
  /** 협회 ID */
  associationId: string;
  /** 리포트 기간 */
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  /** 생성 시점 */
  generatedAt: Timestamp;
  
  /** 팀 유형별 통계 */
  teamTypeStats: TeamTypeStats;
  
  /** 시설별 우선권 사용률 */
  facilityStats: FacilityPriorityStats[];
  
  /** 전환 트리거 통계 */
  conversionStats: ConversionTriggerStats;
  
  /** 요약 메시지 (AI 생성 가능) */
  summary?: string;
  
  /** 메타데이터 */
  metadata: {
    totalBookings: number;
    totalFacilities: number;
    reportVersion: string;
  };
}

/**
 * 대시보드 카드용 간소화된 통계
 */
export interface BookingDashboardCard {
  /** 전체 대관 신청 건수 */
  totalApplications: number;
  /** 확정 건수 */
  confirmedBookings: number;
  /** 대기 건수 */
  waitlistBookings: number;
  /** 회원팀 비율 */
  memberBookingRate: number;
  /** 최근 7일 신청 건수 */
  recent7Days: number;
  /** 가장 많이 사용된 시설 */
  topFacility?: {
    facilityId: string;
    facilityName: string;
    bookingCount: number;
  };
}

