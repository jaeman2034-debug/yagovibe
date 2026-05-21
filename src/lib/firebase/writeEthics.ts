/**
 * _ethicsDecisions/{auditId}에 항상 기록
 */

import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import type { EthicsAction, EthicsVerdict } from "@/types/ethics";

export async function writeEthicsDecision(input: {
  auditId: string;
  tenantId: string;
  collection: string;
  docId: string;
  action: EthicsAction;

  userId: string;

  score: number;
  verdict: EthicsVerdict;
  reasons: string[];
  signals: Record<string, any>;
}) {
  const ref = doc(db, "_ethicsDecisions", input.auditId);
  await setDoc(ref, {
    auditId: input.auditId,
    tenantId: input.tenantId,
    collection: input.collection,
    docId: input.docId,
    action: input.action,

    score: input.score,
    verdict: input.verdict,
    reasons: input.reasons,
    signals: input.signals,

    createdAt: serverTimestamp(),
    createdBy: input.userId,
  });
}

