/**
 * ✅ COMMIT 21: Chaos Injector (랜덤 실패 주입)
 */

import type { ChaosPolicy, ChaosType } from "./chaosPolicy";

/**
 * Chaos Policy 조회 (클라이언트 사이드)
 */
export async function getChaosPolicy(tenantId: string): Promise<ChaosPolicy | null> {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const snap = await getDoc(doc(db, "_chaosPolicies", tenantId));
    return snap.exists() ? (snap.data() as ChaosPolicy) : null;
  } catch (error) {
    console.error("[getChaosPolicy] 조회 오류:", error);
    return null;
  }
}

/**
 * ✅ COMMIT 21: 확률 기반 Chaos 주입
 * 
 * @param policy Chaos Policy (null이면 주입 안 함)
 * @param type 주입할 Chaos 타입
 * @throws Error if chaos is injected
 */
export function maybeChaos(policy: ChaosPolicy | null, type: ChaosType): void {
  if (!policy?.enabled) return;
  if (!policy.types.includes(type)) return;

  if (Math.random() < policy.probability) {
    throw new Error(`CHAOS_INJECTED:${type}`);
  }
}

