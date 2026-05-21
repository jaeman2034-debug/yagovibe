/**
 * 협회 최종 관리자(SuperAdmin) 권한 확인 Hook
 * associations/{associationId} 문서의 superAdminUids 배열 필드에서 확인
 * 
 * 🔥 현재 시스템: adminUids를 SuperAdmin으로 간주 (추후 superAdminUids 필드로 확장 가능)
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

export function useIsAssociationSuperAdmin(associationId: string | undefined) {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId || !user?.uid) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    const checkSuperAdmin = async () => {
      try {
        const associationRef = doc(db, `associations/${associationId}`);
        const associationDoc = await getDoc(associationRef);
        
        if (!associationDoc.exists()) {
          console.log("[useIsAssociationSuperAdmin] 협회 문서가 존재하지 않음:", associationId);
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        const data = associationDoc.data();
        
        // 🔥 현재 시스템: superAdminUids 필드가 없으면 adminUids를 사용
        // 추후 superAdminUids 필드 추가 시 우선 확인
        const superAdminUids = (data?.superAdminUids as string[] | undefined) ?? 
                               (data?.adminUids as string[] | undefined) ?? [];
        const userUid = user.uid;
        
        const isUserSuperAdmin = Array.isArray(superAdminUids) && superAdminUids.includes(userUid);
        
        console.log("[useIsAssociationSuperAdmin] 최종 관리자 권한 확인:", {
          associationId,
          userUid,
          superAdminUids,
          isSuperAdmin: isUserSuperAdmin,
          usingFallback: !data?.superAdminUids, // adminUids를 fallback으로 사용 중인지
        });
        
        setIsSuperAdmin(isUserSuperAdmin);
      } catch (error) {
        console.error("협회 최종 관리자 권한 확인 오류:", error);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, [associationId, user?.uid]);

  return { isSuperAdmin, loading };
}

