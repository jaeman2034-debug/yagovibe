/**
 * 협회 관리자 권한 확인 Hook
 * associations/{associationId}/members/{uid}.role 구조에서 확인
 * 
 * 우선순위:
 * 1. members/{uid}.role === "admin" (새 구조)
 * 2. adminUids 배열 (하위 호환)
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

export function useIsAssociationAdmin(associationId: string | undefined) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!associationId || !user?.uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        // 🔥 새 구조: members/{uid}.role 확인
        const memberRef = doc(db, `associations/${associationId}/members/${user.uid}`);
        const memberDoc = await getDoc(memberRef);
        
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          const role = memberData?.role;
          const isUserAdmin = role === "admin";
          
          console.log("[useIsAssociationAdmin] members 구조 확인:", {
            associationId,
            userUid: user.uid,
            role,
            isAdmin: isUserAdmin,
            source: "members/{uid}.role",
          });
          
          setIsAdmin(isUserAdmin);
          setError(null);
          setLoading(false);
          return;
        }
        
        // 🔥 하위 호환: adminUids 배열 확인
        const associationRef = doc(db, `associations/${associationId}`);
        const associationDoc = await getDoc(associationRef);
        
        if (!associationDoc.exists()) {
          console.log("[useIsAssociationAdmin] 협회 문서가 존재하지 않음:", associationId);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const data = associationDoc.data();
        const adminUids = (data?.adminUids as string[] | undefined) ?? [];
        const userUid = user.uid;
        
        // 🔥 배열 확인 후 includes로 UID 비교
        const isUserAdmin = Array.isArray(adminUids) && adminUids.includes(userUid);
        
        console.log("[useIsAssociationAdmin] adminUids 구조 확인 (하위 호환):", {
          associationId,
          userUid: userUid,
          adminUids,
          isAdmin: isUserAdmin,
          source: "adminUids 배열",
        });
        
        setIsAdmin(isUserAdmin);
        setError(null);
      } catch (err: any) {
        console.error("[useIsAssociationAdmin] 협회 관리자 권한 확인 오류:", err);
        console.error("[useIsAssociationAdmin] 에러 상세:", {
          code: err?.code,
          message: err?.message,
          name: err?.name,
          stack: err?.stack,
        });
        
        // 🔥 Auth 토큰 갱신 실패 감지
        const isAuthError = 
          err?.code === "permission-denied" ||
          err?.message?.includes("securetoken.googleapis.com") ||
          err?.message?.includes("auth/requests-to-this-api") ||
          err?.code === "unauthenticated";
        
        if (isAuthError) {
          setError(new Error("인증 토큰 갱신 실패. 브라우저 확장 프로그램이나 네트워크 설정을 확인해주세요."));
        } else {
          setError(err instanceof Error ? err : new Error(err?.message || "권한 확인 실패"));
        }
        
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [associationId, user?.uid]);

  return { isAdmin, loading, error };
}

