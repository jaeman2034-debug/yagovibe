/**
 * useAssociations Hook
 * 협회 목록 조회 Hook
 */

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Association {
  id: string;
  name: string;
  region?: string;
  createdAt?: any;
}

export function useAssociations() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        setLoading(true);
        setError(null);

        const associationsRef = collection(db, "associations");
        const q = query(associationsRef, orderBy("name"));
        const snapshot = await getDocs(q);

        const associationsList: Association[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.deleted === true) return;
          associationsList.push({
            id: doc.id,
            name: data.name || "",
            region: data.region || "",
            createdAt: data.createdAt,
          });
        });

        setAssociations(associationsList);
      } catch (err: any) {
        // 🔥 상세 에러 로깅 (디버깅용)
        console.error("❌ [useAssociations] 협회 조회 실패:", err);
        console.error("❌ [useAssociations] Error code:", err?.code);
        console.error("❌ [useAssociations] Error message:", err?.message);
        
        // 🔥 방어 코드: 협회 조회 실패해도 팀 생성은 가능해야 함
        // 빈 배열 반환으로 UX 중단 방지
        setError(err instanceof Error ? err : new Error("협회 목록 조회에 실패했습니다."));
        setAssociations([]); // 빈 배열 반환 → 팀 생성 플로우는 계속 진행 가능
      } finally {
        setLoading(false);
      }
    };

    fetchAssociations();
  }, []);

  return {
    associations,
    loading,
    error,
  };
}

