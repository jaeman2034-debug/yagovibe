/**
 * BookingPermissionCTA Component
 * 대관 권한에 따른 CTA 버튼 컴포넌트
 * 
 * useBookingPermission Hook 결과를 기반으로 적절한 CTA를 표시
 */

import React from "react";
import { useBookingPermission, type BookingPermissionResult } from "@/hooks/useBookingPermission";

/**
 * Props
 */
export interface BookingPermissionCTAProps {
  /** 협회 ID */
  associationId: string;
  /** 팀 ID */
  teamId: string;
  /** 시설 ID */
  facilityId: string;
  /** 대관 신청 핸들러 */
  onApply?: () => void;
  /** 대기 신청 핸들러 */
  onWaitlist?: () => void;
  /** 회원 전환 문의 핸들러 */
  onConversion?: () => void;
  /** 로딩 상태 표시 여부 */
  showLoading?: boolean;
  /** 커스텀 스타일 클래스 */
  className?: string;
}

/**
 * 대관 권한 CTA 컴포넌트
 * 
 * @example
 * ```tsx
 * <BookingPermissionCTA
 *   associationId="assoc-nowon-football"
 *   teamId="team-nowon-fc"
 *   facilityId="facility-army-academy"
 *   onApply={() => handleBooking()}
 *   onWaitlist={() => handleWaitlist()}
 *   onConversion={() => handleConversion()}
 * />
 * ```
 */
export default function BookingPermissionCTA({
  associationId,
  teamId,
  facilityId,
  onApply,
  onWaitlist,
  onConversion,
  showLoading = true,
  className = "",
}: BookingPermissionCTAProps) {
  const { loading, permission, error } = useBookingPermission({
    associationId,
    teamId,
    facilityId,
  });

  // 로딩 상태
  if (loading && showLoading) {
    return (
      <div className={`booking-permission-loading ${className}`}>
        <span>권한 확인 중...</span>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={`booking-permission-error ${className}`}>
        <span className="text-red-500">{error}</span>
      </div>
    );
  }

  // 권한 정보 없음
  if (!permission) {
    return null;
  }

  // actionType에 따른 CTA 렌더링
  switch (permission.actionType) {
    case "APPLY":
      // ✅ 대관 신청 가능
      return (
        <div className={`booking-permission-cta ${className}`}>
          <button
            onClick={onApply}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium"
          >
            대관 신청
          </button>
          <p className="text-sm text-gray-600 mt-1">{permission.message}</p>
        </div>
      );

    case "REQUEST":
      // ⏳ 협회 승인 요청
      return (
        <div className={`booking-permission-cta ${className}`}>
          <button
            onClick={onApply}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium"
          >
            대관 요청
          </button>
          <p className="text-sm text-gray-600 mt-1">{permission.message}</p>
        </div>
      );

    case "WAITLIST":
      // ⏳ 대기 신청
      return (
        <div className={`booking-permission-cta ${className}`}>
          <button
            onClick={onWaitlist}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
          >
            대기 신청
          </button>
          <p className="text-sm text-gray-600 mt-1">{permission.message}</p>
        </div>
      );

    case "VIEW_ONLY":
      // ❌ 보기만 가능 (회원 전환 필요)
      return (
        <div className={`booking-permission-cta ${className}`}>
          <p className="text-sm text-gray-700 mb-2">{permission.message}</p>
          {permission.showConversionCTA && (
            <button
              onClick={onConversion}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-medium"
            >
              회원 전환 문의
            </button>
          )}
        </div>
      );

    default:
      return null;
  }
}

/**
 * 권한 결과만으로 CTA를 렌더링하는 순수 컴포넌트
 * (이미 권한을 조회한 경우 사용)
 */
export function BookingPermissionCTAFromResult({
  permission,
  onApply,
  onWaitlist,
  onConversion,
  className = "",
}: {
  permission: BookingPermissionResult;
  onApply?: () => void;
  onWaitlist?: () => void;
  onConversion?: () => void;
  className?: string;
}) {
  switch (permission.actionType) {
    case "APPLY":
      return (
        <div className={`booking-permission-cta ${className}`}>
          <button
            onClick={onApply}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-medium"
          >
            대관 신청
          </button>
          <p className="text-sm text-gray-600 mt-1">{permission.message}</p>
        </div>
      );

    case "REQUEST":
      return (
        <div className={`booking-permission-cta ${className}`}>
          <button
            onClick={onApply}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium"
          >
            대관 요청
          </button>
          <p className="text-sm text-gray-600 mt-1">{permission.message}</p>
        </div>
      );

    case "WAITLIST":
      return (
        <div className={`booking-permission-cta ${className}`}>
          <button
            onClick={onWaitlist}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
          >
            대기 신청
          </button>
          <p className="text-sm text-gray-600 mt-1">{permission.message}</p>
        </div>
      );

    case "VIEW_ONLY":
      return (
        <div className={`booking-permission-cta ${className}`}>
          <p className="text-sm text-gray-700 mb-2">{permission.message}</p>
          {permission.showConversionCTA && (
            <button
              onClick={onConversion}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-medium"
            >
              회원 전환 문의
            </button>
          )}
        </div>
      );

    default:
      return null;
  }
}

