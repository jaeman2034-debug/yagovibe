/**
 * Rollback 로직 (Version → Document)
 * 
 * 버전 스냅샷을 실제 문서에 적용
 * Audit 기록 포함
 */

import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { writeAudit } from "@/lib/audit/writeAudit";

export async function rollbackVersion(input: {
  versionId: string;
  tenantId: string;
  collection: string;
  docId: string;
  userId: string;
}) {
  const versionRef = doc(db, "_versions", input.versionId);
  // ⚠️ 프로젝트 구조: associations/{associationId}/{collection}
  const targetRef = doc(db, `associations/${input.tenantId}/${input.collection}`, input.docId);

  await runTransaction(db, async (tx) => {
    const versionSnap = await tx.get(versionRef);
    if (!versionSnap.exists()) throw new Error("Version not found");

    const version = versionSnap.data() as any;

    // 버전 데이터로 문서 복원
    tx.update(targetRef, {
      ...version.data,
      updatedAt: serverTimestamp(),
      lastRollbackFromVersion: input.versionId,
      lastAuditId: version.auditId,
    });

    // Audit 기록
    writeAudit(tx, {
      action: "rollback",
      tenantId: input.tenantId,
      collection: input.collection,
      docId: input.docId,
      userId: input.userId,
      meta: {
        versionId: input.versionId,
        sourceAuditId: version.auditId,
        reason: version.reason,
      },
    });
  });
}

