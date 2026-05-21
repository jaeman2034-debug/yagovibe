/**
 * 승인 시점 윤리 재평가
 * 
 * 포인트:
 * - 결정은 하지 않음
 * - 승인 시점의 상태/권한 기준으로 재평가
 * - block이면 승인 불가
 */

import { evaluateEthics } from "./scoreEngine";

export function recheckEthicsOnApproval(input: {
  tenantId: string;
  collection: string;
  docId: string;
  payload: any;
  decidedBy: string;
}) {
  // 현재는 간단히 admin 승인 전제
  return evaluateEthics({
    tenantId: input.tenantId,
    userId: input.decidedBy,
    role: "admin",
    collection: input.collection,
    docId: input.docId,
    action: "approve",
    before: null,
    after: input.payload,
  });
}

