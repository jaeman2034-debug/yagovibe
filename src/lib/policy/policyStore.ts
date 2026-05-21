/**
 * 정책 저장소
 * 
 * 테넌트별 Ethics Policy 저장/로드
 */

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { EthicsPolicy } from "@/lib/ethics/scoreEngine";

const defaultPolicy: EthicsPolicy = {
  thresholds: { allow: 80, review: 60 },
  weights: { transparency: 25, accountability: 25, fairness: 25, humanFirst: 25 },
};

/**
 * 테넌트 정책 로드
 */
export async function loadTenantPolicy(tenantId: string): Promise<EthicsPolicy> {
  const ref = doc(db, "_policies", tenantId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as EthicsPolicy;
  }

  // 기본 정책 반환
  return defaultPolicy;
}

/**
 * 테넌트 정책 저장
 */
export async function saveTenantPolicy(
  tenantId: string,
  policy: EthicsPolicy,
  userId: string
): Promise<void> {
  const ref = doc(db, "_policies", tenantId);
  await setDoc(
    ref,
    {
      ...policy,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
    { merge: true }
  );
}

