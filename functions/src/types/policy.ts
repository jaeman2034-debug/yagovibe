/**
 * Policy Engine 타입 정의 (Functions용)
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

