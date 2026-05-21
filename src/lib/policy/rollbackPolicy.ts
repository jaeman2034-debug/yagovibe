/**
 * 정책 롤백 로직
 * 
 * 정책 변경 이력에서 이전 정책으로 복구
 */

import { db } from "@/lib/firebase";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { saveTenantPolicy } from "./policyStore";

export async function rollbackPolicy(input: {
  tenantId: string;
  changeId: string;
  userId: string;
}): Promise<void> {
  const changeRef = doc(db, "_policyChanges", input.changeId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(changeRef);
    if (!snap.exists()) throw new Error("Policy change not found");

    const change = snap.data() as any;

    // 현재 정책을 이전 정책(before)로 되돌림
    await saveTenantPolicy(input.tenantId, change.before, input.userId);

    tx.update(changeRef, {
      rollbackFrom: change.changeId,
      rolledBackAt: serverTimestamp(),
      rolledBackBy: input.userId,
    });
  });
}

