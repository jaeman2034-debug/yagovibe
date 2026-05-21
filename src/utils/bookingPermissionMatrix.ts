/**
 * Booking Permission Matrix
 * 팀 상태 + 시설 정책 → 대관 권한 매트릭스
 * 
 * 이 매트릭스 하나로 모든 UX 분기 자동화
 */

import { TeamStatus } from "@/types/policy";
import { FacilityAccessPolicy } from "@/types/policy";
import { BookingPermission } from "@/types/policy";
import type { PermissionDecision } from "@/types/policy";

/**
 * 대관 권한 매트릭스
 * 
 * [TeamStatus][FacilityAccessPolicy] → BookingPermission
 */
export const BOOKING_PERMISSION_MATRIX: Record<
  TeamStatus,
  Record<FacilityAccessPolicy, BookingPermission>
> = {
  [TeamStatus.MEMBER]: {
    [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: BookingPermission.APPLY,
    [FacilityAccessPolicy.ASSOCIATION_MANAGED]: BookingPermission.APPLY,
    [FacilityAccessPolicy.PUBLIC_OPEN]: BookingPermission.APPLY,
  },
  [TeamStatus.ACADEMY]: {
    [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: BookingPermission.REQUEST,
    [FacilityAccessPolicy.ASSOCIATION_MANAGED]: BookingPermission.REQUEST,
    [FacilityAccessPolicy.PUBLIC_OPEN]: BookingPermission.APPLY,
  },
  [TeamStatus.NON_MEMBER]: {
    [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: BookingPermission.VIEW_ONLY,
    [FacilityAccessPolicy.ASSOCIATION_MANAGED]: BookingPermission.WAITLIST,
    [FacilityAccessPolicy.PUBLIC_OPEN]: BookingPermission.APPLY,
  },
  [TeamStatus.PENDING]: {
    [FacilityAccessPolicy.ASSOCIATION_PRIORITY]: BookingPermission.VIEW_ONLY,
    [FacilityAccessPolicy.ASSOCIATION_MANAGED]: BookingPermission.WAITLIST,
    [FacilityAccessPolicy.PUBLIC_OPEN]: BookingPermission.APPLY,
  },
};

/**
 * 상태 메시지 매핑 (권한별)
 */
export const PERMISSION_MESSAGE_MAP: Record<BookingPermission, string> = {
  [BookingPermission.APPLY]: "우선 배정 대상입니다",
  [BookingPermission.REQUEST]: "협회 선대관 일정 내 배정됩니다",
  [BookingPermission.WAITLIST]: "잔여 시간대만 이용 가능",
  [BookingPermission.VIEW_ONLY]: "잔여 시간대만 이용 가능",
};

/**
 * Reason Code → Message 매핑 (상세 메시지)
 */
export const REASON_MESSAGE_MAP: Record<string, string> = {
  [`${TeamStatus.MEMBER}_${FacilityAccessPolicy.ASSOCIATION_PRIORITY}`]: "우선 배정 대상입니다",
  [`${TeamStatus.MEMBER}_${FacilityAccessPolicy.ASSOCIATION_MANAGED}`]: "우선 배정 대상입니다",
  [`${TeamStatus.MEMBER}_${FacilityAccessPolicy.PUBLIC_OPEN}`]: "대관 신청 가능",
  [`${TeamStatus.ACADEMY}_${FacilityAccessPolicy.ASSOCIATION_PRIORITY}`]: "협회 선대관 일정 내 배정됩니다",
  [`${TeamStatus.ACADEMY}_${FacilityAccessPolicy.ASSOCIATION_MANAGED}`]: "협회 선대관 일정 내 배정됩니다",
  [`${TeamStatus.ACADEMY}_${FacilityAccessPolicy.PUBLIC_OPEN}`]: "대관 신청 가능",
  [`${TeamStatus.NON_MEMBER}_${FacilityAccessPolicy.ASSOCIATION_PRIORITY}`]: "잔여 시간대만 이용 가능",
  [`${TeamStatus.NON_MEMBER}_${FacilityAccessPolicy.ASSOCIATION_MANAGED}`]: "잔여 시간대만 이용 가능",
  [`${TeamStatus.NON_MEMBER}_${FacilityAccessPolicy.PUBLIC_OPEN}`]: "대관 신청 가능",
  [`${TeamStatus.PENDING}_${FacilityAccessPolicy.ASSOCIATION_PRIORITY}`]: "전환 문의 처리 중입니다",
  [`${TeamStatus.PENDING}_${FacilityAccessPolicy.ASSOCIATION_MANAGED}`]: "전환 문의 처리 중입니다",
  [`${TeamStatus.PENDING}_${FacilityAccessPolicy.PUBLIC_OPEN}`]: "대관 신청 가능",
};

/**
 * 팀 상태와 시설 정책으로 대관 권한 조회
 * 
 * @param teamStatus - 팀 상태
 * @param facilityPolicy - 시설 접근 정책
 * @returns PermissionDecision
 */
export function getBookingPermission(
  teamStatus: TeamStatus,
  facilityPolicy: FacilityAccessPolicy
): PermissionDecision {
  const actionType = BOOKING_PERMISSION_MATRIX[teamStatus][facilityPolicy];
  const reasonCode = `${teamStatus}_${facilityPolicy}`;
  const message = REASON_MESSAGE_MAP[reasonCode] || PERMISSION_MESSAGE_MAP[actionType];
  
  // 전환 CTA 표시 여부
  const showConversionCTA = 
    teamStatus === TeamStatus.NON_MEMBER &&
    actionType === BookingPermission.VIEW_ONLY;
  
  return {
    actionType,
    reasonCode,
    message,
    showConversionCTA,
  };
}

/**
 * 대관 가능 여부 확인
 */
export function canApplyBooking(permission: BookingPermission): boolean {
  return permission === BookingPermission.APPLY || permission === BookingPermission.REQUEST;
}

/**
 * 대기 신청 가능 여부 확인
 */
export function canWaitlist(permission: BookingPermission): boolean {
  return permission === BookingPermission.WAITLIST;
}

/**
 * 보기만 가능 여부 확인
 */
export function isViewOnly(permission: BookingPermission): boolean {
  return permission === BookingPermission.VIEW_ONLY;
}

