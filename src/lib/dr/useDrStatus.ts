/**
 * ✅ COMMIT 19: DR 상태 실시간 구독 훅
 */

import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import React from "react";
import type { DrPolicy } from "./drPolicy";

export function useDrStatus(tenantId: string): DrPolicy | null {
  const [policy, setPolicy] = React.useState<DrPolicy | null>(null);

  React.useEffect(() => {
    if (!tenantId) {
      setPolicy(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "_drPolicies", tenantId),
      (snap) => {
        setPolicy(snap.exists() ? (snap.data() as DrPolicy) : null);
      },
      (error) => {
        console.error("[useDrStatus] 구독 오류:", error);
        setPolicy(null);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return policy;
}

/**
 * 서버 사이드에서 DR 정책 조회 (Functions/서버 컴포넌트용)
 * ✅ COMMIT 24: 만료 체크 (expiresAt이 지났으면 normal로 간주)
 */
export async function getCurrentDrPolicy(tenantId: string): Promise<DrPolicy | null> {
  try {
    const { doc, getDoc, updateDoc, serverTimestamp, deleteField } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const snap = await getDoc(doc(db, "_drPolicies", tenantId));
    if (!snap.exists) return null;

    const policy = snap.data() as DrPolicy;
    const expiresAt = policy.expiresAt;

    // ✅ COMMIT 24: 만료 체크
    if (expiresAt) {
      const expiresDate = expiresAt?.toDate?.() ?? new Date(expiresAt);
      if (expiresDate < new Date()) {
        // 만료됨 → 자동 해제 (비동기, 결과 기다리지 않음)
        updateDoc(doc(db, "_drPolicies", tenantId), {
          mode: "normal",
          message: null,
          expiresAt: deleteField(),
          updatedAt: serverTimestamp(),
        }).catch((error) => {
          console.error("[getCurrentDrPolicy] 만료 정책 정리 실패:", error);
        });
        return null; // 만료되었으므로 normal로 간주
      }
    }

    return policy;
  } catch (error) {
    console.error("[getCurrentDrPolicy] 조회 오류:", error);
    return null;
  }
}

