/**
 * ✅ COMMIT 21: Functions 레벨 Chaos 정책 조회
 */

import * as admin from "firebase-admin";
import type { ChaosPolicy, ChaosType } from "../../../src/lib/chaos/chaosPolicy";

const db = admin.firestore();

export interface ChaosPolicyServer {
  tenantId: string;
  enabled: boolean;
  probability: number;
  types: ChaosType[];
  updatedAt?: admin.firestore.Timestamp;
}

export async function getChaosPolicy(tenantId: string): Promise<ChaosPolicyServer | null> {
  try {
    const doc = await db.collection("_chaosPolicies").doc(tenantId).get();
    if (!doc.exists) return null;
    return doc.data() as ChaosPolicyServer;
  } catch (error: any) {
    console.error(`[getChaosPolicy] 조회 오류: ${error?.message}`);
    return null;
  }
}

/**
 * ✅ COMMIT 21: 확률 기반 Chaos 주입 (서버 사이드)
 */
export function maybeChaos(policy: ChaosPolicyServer | null, type: ChaosType): void {
  if (!policy?.enabled) return;
  if (!policy.types.includes(type)) return;

  if (Math.random() < policy.probability) {
    throw new Error(`CHAOS_INJECTED:${type}`);
  }
}

