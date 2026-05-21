/**
 * 협회 Owner 권한 확인 Hook
 * associations/{associationId}.ownerUid 기준으로 확인
 * 
 * 관리자 판별 기준:
 * - 로그인 사용자 UID === associations/{associationId}.ownerUid
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

export function useIsAssociationOwner(associationId: string | undefined) {
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!associationId || !user?.uid) {
      setIsOwner(false);
      setLoading(false);
      return;
    }

    const checkOwner = async () => {
      try {
        const associationRef = doc(db, `associations/${associationId}`);
        const associationDoc = await getDoc(associationRef);
        
        if (!associationDoc.exists()) {
          console.log("[useIsAssociationOwner] 협회 문서가 존재하지 않음:", associationId);
          setIsOwner(false);
          setLoading(false);
          return;
        }

        const data = associationDoc.data();
        const ownerUid = data?.ownerUid;
        const userUid = user.uid;
        const isUserOwner = ownerUid === userUid;
        
        console.log("[useIsAssociationOwner] ownerUid 기준 확인:", {
          associationId,
          userUid,
          ownerUid,
          isOwner: isUserOwner,
        });
        
        setIsOwner(isUserOwner);
        setError(null);
      } catch (err: any) {
        console.error("[useIsAssociationOwner] 협회 Owner 권한 확인 오류:", err);
        console.error("[useIsAssociationOwner] 에러 상세:", {
          code: err?.code,
          message: err?.message,
          name: err?.name,
          stack: err?.stack,
        });
        
        setError(err instanceof Error ? err : new Error(err?.message || "권한 확인 실패"));
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkOwner();
  }, [associationId, user?.uid]);

  return { isOwner, loading, error };
}
