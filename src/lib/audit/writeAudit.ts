/**
 * Audit 기록 유틸 (트랜잭션 내 사용)
 * 
 * 트랜잭션 내에서 _auditLogs에 기록
 */

import { doc, serverTimestamp, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 트랜잭션 내에서 Audit 기록
 * 
 * @param tx Firestore Transaction 객체
 * @param input Audit 로그 데이터
 */
export function writeAudit(
  tx: any,
  input: {
    action: string;
    tenantId: string;
    collection: string;
    docId: string;
    userId: string;
    meta?: any;
  }
) {
  // 트랜잭션 내에서 문서 생성
  const auditId = window.crypto.randomUUID();
  const auditRef = doc(db, "_auditLogs", auditId);
  
  tx.set(auditRef, {
    action: input.action,
    tenantId: input.tenantId,
    collection: input.collection,
    docId: input.docId,
    userId: input.userId,
    meta: input.meta ?? null,
    createdAt: serverTimestamp(),
  });
}

