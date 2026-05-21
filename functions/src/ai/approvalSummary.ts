// functions/src/ai/approvalSummary.ts
import * as admin from "firebase-admin";
import { summarizeWithLlmOrFallback } from "./llm";

const db = admin.firestore();

export async function generateApprovalSummary(approvalId: string) {
  const approvalRef = db.collection("_approvals").doc(approvalId);
  const ethicsRef = db.collection("_ethicsDecisions").doc(approvalId);

  const [approvalSnap, ethicsSnap] = await Promise.all([approvalRef.get(), ethicsRef.get()]);
  if (!approvalSnap.exists) throw new Error("Approval not found");

  const approval = approvalSnap.data() as any;
  const ethics = ethicsSnap.exists ? (ethicsSnap.data() as any) : null;

  // 이미 요약이 있고, 재생성 필요 없으면 종료
  if (approval?.summary && approval?.recommendation) return { ok: true, skipped: true };

  const { summary, recommendation } = await summarizeWithLlmOrFallback({
    collection: approval.collection,
    action: approval.action,
    docId: approval.docId ?? null,
    before: approval.before ?? null,
    payload: approval.payload ?? null,
    ethicsScore: approval.ethicsScore ?? ethics?.score,
    ethicsReasons: approval.ethicsReasons ?? ethics?.reasons ?? [],
  });

  await approvalRef.set(
    {
      summary,
      recommendation,
      summaryUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true, skipped: false };
}

