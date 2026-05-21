/**
 * 정책 변경 이력 저장소
 * 
 * 정책 변경 시 이력을 _policyChanges 컬렉션에 저장
 */

import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import type { PolicyChange } from "@/types/policyChange";
import type { EthicsPolicy } from "@/lib/ethics/scoreEngine";

export async function writePolicyChange(input: {
  tenantId: string;
  before: EthicsPolicy;
  after: EthicsPolicy;
  simulationResult: {
    allow: number;
    review: number;
    block: number;
    riskScore: number;
  };
  userId: string;
}): Promise<string> {
  const changeId =
    (globalThis.crypto && "randomUUID" in globalThis.crypto && globalThis.crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const ref = doc(db, "_policyChanges", changeId);

  await setDoc(ref, {
    changeId,
    tenantId: input.tenantId,
    before: input.before,
    after: input.after,
    simulationResult: input.simulationResult,
    createdAt: serverTimestamp(),
    createdBy: input.userId,
  });

  return changeId;
}

