/**
 * useBookingPermission Hook
 * 대관 권한 조회 React Hook
 * 
 * 팀/시설 변경 시 서버에 권한 질의하고 결과를 반환
 * UI는 조건문 없이 그대로 렌더링
 */

import { useEffect, useState, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { useTeam } from "@/context/TeamContext";

/**
 * Hook 파라미터
 */
export interface UseBookingPermissionParams {
  associationId: string;
  teamId: string;
  facilityId: string;
  /** 자동 조회 비활성화 (수동 호출만 사용) */
  enabled?: boolean;
}

/**
 * 대관 권한 결과 타입
 */
export interface BookingPermissionResult {
  /** 대관 신청 가능 여부 */
  canBook: boolean;
  /** 대기 신청 가능 여부 */
  canWaitlist: boolean;
  /** 우선순위 */
  priority: "HIGH" | "MEDIUM" | "LOW";
  /** 사용자 메시지 */
  message: string;
  /** 액션 타입 */
  actionType: "APPLY" | "REQUEST" | "WAITLIST" | "VIEW_ONLY";
  /** 결정 이유 코드 */
  reasonCode: string;
  /** 회원팀 전환 CTA 표시 여부 */
  showConversionCTA?: boolean;
}

/**
 * Hook 반환 타입
 */
export interface UseBookingPermissionReturn {
  /** 로딩 상태 */
  loading: boolean;
  /** 권한 결과 */
  permission: BookingPermissionResult | null;
  /** 에러 메시지 */
  error: string | null;
  /** 수동으로 권한 조회 (enabled: false일 때 사용) */
  refetch: () => Promise<void>;
}

/**
 * 대관 권한 조회 Hook
 * 
 * @example
 * ```tsx
 * const { loading, permission, error } = useBookingPermission({
 *   associationId: "assoc-nowon-football",
 *   teamId: "team-nowon-fc",
 *   facilityId: "facility-army-academy"
 * });
 * 
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * 
 * switch (permission?.actionType) {
 *   case "APPLY":
 *     return <Button>대관 신청</Button>;
 *   case "WAITLIST":
 *     return <Button variant="secondary">대기 신청</Button>;
 *   case "VIEW_ONLY":
 *     return <Text>{permission.message}</Text>;
 * }
 * ```
 */
export function useBookingPermission({
  associationId,
  teamId,
  facilityId,
  enabled = true,
}: UseBookingPermissionParams): UseBookingPermissionReturn {
  const { user } = useAuth(); // 🔥 사용자 정보 (가드용)
  const { myTeam } = useTeam(); // 🔥 팀 컨텍스트 (가드용)
  const [loading, setLoading] = useState<boolean>(true);
  const [permission, setPermission] = useState<BookingPermissionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 권한 조회 함수 (가드 + 실패 안전 구조)
   */
  const fetchPermission = useCallback(async () => {
    // 🔥 최소 가드 (필수): Policy Engine을 호출하기 전에 필수 조건 확인
    if (!user?.uid) {
      console.warn("[useBookingPermission] NO_USER: 사용자 정보 없음");
      setPermission({
        canBook: false,
        canWaitlist: false,
        priority: "LOW",
        message: "로그인이 필요합니다.",
        actionType: "VIEW_ONLY",
        reasonCode: "NO_USER",
        showConversionCTA: false,
      });
      setLoading(false);
      setError(null);
      return;
    }

    if (!teamId || teamId.trim() === "") {
      console.warn("[useBookingPermission] NO_TEAM: 팀 ID 없음");
      setPermission({
        canBook: false,
        canWaitlist: false,
        priority: "LOW",
        message: "팀 정보가 필요합니다.",
        actionType: "VIEW_ONLY",
        reasonCode: "NO_TEAM",
        showConversionCTA: false,
      });
      setLoading(false);
      setError(null);
      return;
    }

    // 🔥 팀 컨텍스트 일치 확인 (중요)
    if (!myTeam || myTeam.id !== teamId) {
      console.warn("[useBookingPermission] TEAM_CONTEXT_MISMATCH: 팀 컨텍스트 불일치", {
        requestedTeamId: teamId,
        contextTeamId: myTeam?.id,
      });
      setPermission({
        canBook: false,
        canWaitlist: false,
        priority: "LOW",
        message: "팀 정보를 불러오는 중입니다.",
        actionType: "VIEW_ONLY",
        reasonCode: "TEAM_CONTEXT_MISMATCH",
        showConversionCTA: false,
      });
      setLoading(false);
      setError(null);
      return;
    }

    // 🔥 정책 호출 완전 차단 가드 (액션 A)
    // 📌 원칙: 팀 생성 직후에는 정책 판단 자체를 하지 않는다
    // 예약은 "팀 상세 화면 이후"에만 의미 있음
    // (현재 Team 인터페이스에 status 필드가 없으므로, 팀 컨텍스트 불일치로 이미 차단됨)
    // 추가로: 팀이 방금 생성되었을 가능성 체크 (컨텍스트가 아직 준비되지 않았을 때)
    if (!myTeam.sportType) {
      console.warn("[useBookingPermission] TEAM_NOT_READY: sportType 없음 (팀 초기화 중)");
      setPermission({
        canBook: false,
        canWaitlist: false,
        priority: "LOW",
        message: "팀 정보를 확인하는 중입니다.",
        actionType: "VIEW_ONLY",
        reasonCode: "TEAM_NOT_READY",
        showConversionCTA: false,
      });
      setLoading(false);
      setError(null);
      return;
    }

    // 필수 파라미터 검증 (빈 문자열도 차단)
    if (!associationId || !facilityId || 
        associationId.trim() === "" || facilityId.trim() === "") {
      setPermission({
        canBook: false,
        canWaitlist: false,
        priority: "LOW",
        message: "필수 정보가 누락되었습니다.",
        actionType: "VIEW_ONLY",
        reasonCode: "MISSING_PARAMS",
        showConversionCTA: false,
      });
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const getBookingPermissionFn = httpsCallable<
        {
          associationId: string;
          teamId: string;
          facilityId: string;
        },
        BookingPermissionResult
      >(functions, "getBookingPermission");

      const result = await getBookingPermissionFn({
        associationId,
        teamId,
        facilityId,
      });

      setPermission(result.data);
      setError(null); // 성공 시 에러 초기화
    } catch (err: any) {
      // 🔥 가장 중요한 "실패 안전(default)" 구조
      // functions/internal은 정책 시스템의 내부 에러일 뿐, 유저 UX를 깨면 안 됨
      console.warn("[useBookingPermission] Policy Engine 실패, fallback 사용:", {
        code: err?.code,
        message: err?.message,
        teamId,
      });
      
      // ✅ 여기서 throw 금지 (절대)
      // Policy Engine 실패는 앱 사용을 막지 않음
      setPermission({
        canBook: false,
        canWaitlist: false,
        priority: "LOW",
        message: "권한 정보 확인 중입니다. 잠시 후 다시 시도해주세요.",
        actionType: "VIEW_ONLY",
        reasonCode: "POLICY_TEMP_UNAVAILABLE",
        showConversionCTA: false,
      });
      setError(null); // 에러를 사용자에게 노출하지 않음 (권한 체크는 실패해도 앱 사용 가능)
    } finally {
      setLoading(false);
    }
  }, [associationId, teamId, facilityId, user?.uid, myTeam]);

  /**
   * 자동 조회 (enabled: true일 때)
   */
  useEffect(() => {
    // enabled가 false이거나 필수 파라미터가 없으면 조회하지 않음
    if (!enabled || !associationId || !teamId || !facilityId ||
        associationId.trim() === "" || teamId.trim() === "" || facilityId.trim() === "") {
      setLoading(false);
      setPermission(null);
      setError(null);
      return;
    }
    
    fetchPermission();
  }, [enabled, associationId, teamId, facilityId, fetchPermission]);

  return {
    loading,
    permission,
    error,
    refetch: fetchPermission,
  };
}

