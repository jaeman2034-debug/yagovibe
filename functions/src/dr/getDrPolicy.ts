/**
 * ✅ COMMIT 19: Functions 레벨 DR 정책 조회
 */

import * as admin from "firebase-admin";

const db = admin.firestore();

export interface DrPolicy {
  tenantId: string;
  mode: "normal" | "read_only" | "write_blocked" | "region_down";
  affectedRegions?: string[];
  message?: string;
  updatedAt?: admin.firestore.Timestamp;
}

export async function getDrPolicy(tenantId: string): Promise<DrPolicy | null> {
  try {
    const doc = await db.collection("_drPolicies").doc(tenantId).get();
    if (!doc.exists) return null;
    return doc.data() as DrPolicy;
  } catch (error: any) {
    console.error(`[getDrPolicy] 조회 오류: ${error?.message}`);
    return null;
  }
}

