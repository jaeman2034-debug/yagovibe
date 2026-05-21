/**
 * Policy Engine 타입 정의
 * 협회 중심 권한 관리 시스템
 */

/**
 * 팀 상태 (Team Status)
 */
export enum TeamStatus {
  /** 회원팀 (연 240만원 납부, 운동장 우선 대관) */
  MEMBER = "MEMBER",
  
  /** 비회원팀 (회비 없음, 잔여 대관만 가능) */
  NON_MEMBER = "NON_MEMBER",
  
  /** 아카데미/파트너 (비회원, 발전기금 100~200만원, 협회 통해 대관) */
  ACADEMY = "ACADEMY",
  
  /** 전환 문의 중 (비회원 → 회원 전환 요청 접수됨) */
  PENDING = "PENDING",
}

/**
 * TeamStatus 타입 가드
 */
export function isTeamStatus(value: string): value is TeamStatus {
  return Object.values(TeamStatus).includes(value as TeamStatus);
}

/**
 * TeamStatus 디스플레이 이름
 */
export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  [TeamStatus.MEMBER]: "회원팀",
  [TeamStatus.NON_MEMBER]: "비회원팀",
  [TeamStatus.ACADEMY]: "아카데미",
  [TeamStatus.PENDING]: "전환 문의 중",
};

/**
 * TeamStatus 색상 (디자인 시스템)
 */
export const TEAM_STATUS_COLORS: Record<TeamStatus, {
  icon: string;
  bg: string;
  border: string;
  text: string;
  button: string;
}> = {
  [TeamStatus.MEMBER]: {
    icon: "🟢",
    bg: "#ECFDF5",
    border: "#059669",
    text: "#059669",
    button: "#059669",
  },
  [TeamStatus.NON_MEMBER]: {
    icon: "⚪",
    bg: "#F9FAFB",
    border: "#E5E7EB",
    text: "#6B7280",
    button: "#6B7280",
  },
  [TeamStatus.ACADEMY]: {
    icon: "🔵",
    bg: "#EFF6FF",
    border: "#2563EB",
    text: "#2563EB",
    button: "#2563EB",
  },
  [TeamStatus.PENDING]: {
    icon: "⚪",
    bg: "#FEF3C7",
    border: "#F59E0B",
    text: "#92400E",
    button: "#F59E0B",
  },
};

/**
 * 시설 접근 정책 (Facility Access Policy)
 */
export enum FacilityAccessPolicy {
  /** 협회 우선 대관 (육사/경기기계공고/과기대 - 협회 선대관 자산) */
  ASSOCIATION_PRIORITY = "ASSOCIATION_PRIORITY",
  
  /** 협회 배정 (아카데미 대상) */
  ASSOCIATION_MANAGED = "ASSOCIATION_MANAGED",
  
  /** 일반 공공 (모든 팀 동일 접근) */
  PUBLIC_OPEN = "PUBLIC_OPEN",
}

/**
 * FacilityAccessPolicy 타입 가드
 */
export function isFacilityAccessPolicy(value: string): value is FacilityAccessPolicy {
  return Object.values(FacilityAccessPolicy).includes(value as FacilityAccessPolicy);
}

/**
 * FacilityAccessPolicy 디스플레이 이름
 */
export const FACILITY_ACCESS_POLICY_LABELS: Record<FacilityAccessPolicy, string> = {
  [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: "협회 우선 대관 시설",
  [FacilityAccessPolicy.ASSOCIATION_MANAGED]: "협회 배정 시설",
  [FacilityAccessPolicy.PUBLIC_OPEN]: "일반 대관 시설",
};

/**
 * 대관 권한 액션 타입 (Booking Permission)
 */
export enum BookingPermission {
  /** 대관 신청 가능 (회원팀의 모든 시설, 일반 시설) */
  APPLY = "APPLY",
  
  /** 협회 승인 요청 (아카데미의 협회 배정 시설) */
  REQUEST = "REQUEST",
  
  /** 대기 신청 (비회원팀의 협회 배정 시설) */
  WAITLIST = "WAITLIST",
  
  /** 보기만 가능 (비회원팀의 협회 우선 시설, 전환 문의 중) */
  VIEW_ONLY = "VIEW_ONLY",
}

/**
 * BookingPermission 타입 가드
 */
export function isBookingPermission(value: string): value is BookingPermission {
  return Object.values(BookingPermission).includes(value as BookingPermission);
}

/**
 * BookingPermission 디스플레이 이름
 */
export const BOOKING_PERMISSION_LABELS: Record<BookingPermission, string> = {
  [BookingPermission.APPLY]: "대관 신청",
  [BookingPermission.REQUEST]: "대관 요청",
  [BookingPermission.WAITLIST]: "대기 신청",
  [BookingPermission.VIEW_ONLY]: "보기만 가능",
};

/**
 * 권한 결정 결과 (Permission Decision)
 */
export interface PermissionDecision {
  /** 액션 타입 */
  actionType: BookingPermission;
  
  /** 결정 이유 코드 (UI 메시지 매핑용) */
  reasonCode: string;
  
  /** 사용자 메시지 */
  message?: string;
  
  /** 회원팀 전환 CTA 표시 여부 */
  showConversionCTA?: boolean;
}

