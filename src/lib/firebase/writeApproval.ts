/**
 * _approvals/{auditId}로 "승인요청" 생성 (pending)
 */

import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { requestApprovalSummary } from "@/lib/api/ai";

export async function createApprovalRequest(input: {
  auditId: string;

  tenantId: string;
  collection: string;
  docId?: string | null;
  action: string;

  payload: any;
  before?: any;

  ethicsScore: number;
  ethicsReasons: string[];

  userId: string;
}) {
  const ref = doc(db, "_approvals", input.auditId);
  await setDoc(ref, {
    auditId: input.auditId,

    tenantId: input.tenantId,
    collection: input.collection,
    docId: input.docId ?? null,
    action: input.action,

    payload: input.payload,
    before: input.before ?? null,

    ethicsScore: input.ethicsScore,
    ethicsReasons: input.ethicsReasons,

    status: "pending",

    createdAt: serverTimestamp(),
    createdBy: input.userId,
  });

  // ✅ 승인 요청 생성 후 AI 요약 요청 (비동기, 실패해도 본 흐름 영향 없음)
  try {
    // fire-and-forget: 응답을 기다리지 않음
    requestApprovalSummary(input.auditId).catch((error) => {
      console.error("[createApprovalRequest] AI 요약 요청 실패 (무시됨):", error);
    });
  } catch (error) {
    // 동기 에러도 무시 (본 흐름에 영향 없음)
    console.error("[createApprovalRequest] AI 요약 요청 예외 (무시됨):", error);
  }
}

