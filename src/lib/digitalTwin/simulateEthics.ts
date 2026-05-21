/**
 * Digital Twin: Ethics 판단 재생 시뮬레이션
 * 
 * 기존 _ethicsDecisions를 새로운 정책으로 재평가하여 결과 예측
 */

import { evaluateEthicsWithPolicy, type EthicsContext, type EthicsPolicy } from "@/lib/ethics/scoreEngine";

export function simulateEthicsDecisions(input: {
  decisions: any[]; // 기존 _ethicsDecisions snapshot
  newPolicy: EthicsPolicy; // 변경하려는 policy
}) {
  let allow = 0;
  let review = 0;
  let block = 0;

  const diffs: any[] = [];

  for (const d of input.decisions) {
    const simulated = evaluateEthicsWithPolicy(
      {
        tenantId: d.tenantId,
        userId: d.createdBy,
        role: d.signals?.role ?? "editor",
        collection: d.collection,
        docId: d.docId,
        action: d.action,
        before: null,
        after: null,
        editCountLast10m: d.signals?.editBurst ?? 0,
        deleteRestoreLoopLast1h: d.signals?.deleteRestoreLoop ?? 0,
      },
      input.newPolicy
    );

    if (simulated.verdict === "allow") allow++;
    if (simulated.verdict === "review_required") review++;
    if (simulated.verdict === "block") block++;

    if (simulated.verdict !== d.verdict) {
      diffs.push({
        auditId: d.auditId,
        from: d.verdict,
        to: simulated.verdict,
        scoreFrom: d.score,
        scoreTo: simulated.score,
      });
    }
  }

  return {
    total: input.decisions.length,
    allow,
    review,
    block,
    diffs,
  };
}

