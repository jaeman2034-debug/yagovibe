/**
 * 최신 정책 시뮬레이션 RiskScore 훅
 * 
 * 테넌트의 가장 최근 정책 변경 시뮬레이션 결과의 riskScore를 반환
 */

import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";

export function useLatestPolicyRiskScore(tenantId: string): number | null {
  const [risk, setRisk] = useState<number | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setRisk(null);
      return;
    }

    const loadRisk = async () => {
      try {
        // 인덱스 없이도 동작하도록 단순 쿼리 사용
        const q = query(
          collection(db, "_policyChanges"),
          where("tenantId", "==", tenantId),
          limit(10) // 최근 10건만 가져와서 클라이언트에서 정렬
        );

        const snap = await getDocs(q);
        if (snap.empty) {
          setRisk(null);
          return;
        }

        // 클라이언트에서 최신순 정렬
        const changes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        changes.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        });

        const latest = changes[0];
        const riskScore = latest?.simulationResult?.riskScore ?? null;
        setRisk(typeof riskScore === "number" ? riskScore : null);
      } catch (error) {
        console.error("[useLatestPolicyRiskScore] 로드 실패:", error);
        setRisk(null);
      }
    };

    loadRisk();
  }, [tenantId]);

  return risk;
}

