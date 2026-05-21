/**
 * 버전 스냅샷 Writer
 * 
 * 트랜잭션 내에서 _versions 컬렉션에 버전 스냅샷 저장
 */

import { doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function writeVersion(
  tx: any,
  input: {
    tenantId: string;
    collection: string;
    docId: string;
    data: any;
    userId: string;
    auditId: string;
    reason: string; // approved_apply | manual_update | rollback
  }
) {
  const versionId = window.crypto.randomUUID();
  const ref = doc(db, "_versions", `${input.collection}_${input.docId}_${versionId}`);

  tx.set(ref, {
    tenantId: input.tenantId,
    collection: input.collection,
    docId: input.docId,
    data: input.data,
    reason: input.reason,
    auditId: input.auditId,
    createdAt: serverTimestamp(),
    createdBy: input.userId,
  });
}

