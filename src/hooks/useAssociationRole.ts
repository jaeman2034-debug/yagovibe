/**
 * 협회별 역할 조회 Hook
 * 
 * Sprint 7: 권한·역할·브랜딩
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { Role } from "@/types/role";

export function useAssociationRole(associationId?: string) {
  const { user } = useAuth();
  const [role, setRole] = useState<Role>("guest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId || !user) {
      setRole("guest");
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        // 협회 정보 조회
        const associationRef = doc(db, `associations/${associationId}`);
        const associationSnap = await getDoc(associationRef);

        if (!associationSnap.exists()) {
          setRole("guest");
          setLoading(false);
          return;
        }

        const associationData = associationSnap.data();
        const admins = associationData.admins || [];
        const members = associationData.members || [];

        // super_admin 체크 (추후 플랫폼 레벨에서 관리)
        // 지금은 admin만 체크

        // admin 체크
        if (admins.includes(user.uid)) {
          setRole("admin");
        } else if (members.includes(user.uid)) {
          setRole("member");
        } else {
          setRole("guest");
        }
      } catch (error) {
        console.error("역할 조회 오류:", error);
        setRole("guest");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [associationId, user]);

  return { role, loading };
}

