/**
 * 🔥 권한 확인 Hook
 * 
 * 역할:
 * - 사용자 권한 실시간 확인
 * - UI 가드 자동 적용
 */

import { useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import { checkPermissions, canPay, canCreate, canJoin, canHost } from "@/utils/permissionLevel";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";

export interface UsePermissionsResult {
  permissions: ReturnType<typeof checkPermissions>;
  canPay: boolean;
  canCreate: boolean;
  canJoin: boolean;
  canHost: boolean;
  loading: boolean;
  trustTier: string | null;
  trustScore: number | null;
}

/**
 * 권한 확인 Hook
 * 
 * @returns UsePermissionsResult
 */
export function usePermissions(): UsePermissionsResult {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Firestore user 데이터 조회
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setUserData(null);
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        } else {
          setUserData(null);
        }
      } catch (error: any) {
        // 🔥 배포 안정화: 권한 오류 시 graceful 처리 (기본값 반환)
        if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
          console.warn("⚠️ [usePermissions] 권한 오류 (기본값 반환):", error?.message);
          setUserData(null); // 기본값으로 처리
        } else {
          console.error("❌ [usePermissions] 사용자 데이터 조회 실패:", error);
          setUserData(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // 🔥 권한 계산 (메모이제이션)
  const permissions = useMemo(() => {
    return checkPermissions(user, userData);
  }, [user, userData]);

  const canPayResult = useMemo(() => {
    return canPay(user, userData);
  }, [user, userData]);

  const canCreateResult = useMemo(() => {
    return canCreate(user, userData);
  }, [user, userData]);

  const canJoinResult = useMemo(() => {
    return canJoin(user, userData);
  }, [user, userData]);

  const canHostResult = useMemo(() => {
    return canHost(user, userData);
  }, [user, userData]);

  return {
    permissions,
    canPay: canPayResult,
    canCreate: canCreateResult,
    canJoin: canJoinResult,
    canHost: canHostResult,
    loading,
    trustTier: userData?.trustTier || null,
    // 🔥 배포 안정화: trustScore null 처리 (기본값 0)
    trustScore: userData?.trustScore ?? 0,
  };
}
