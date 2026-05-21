import type { EthicsAction, EthicsVerdict } from "@/types/ethics";

export type EthicsContext = {
  tenantId: string;
  userId: string;
  role: "admin" | "editor" | "viewer";
  collection: string;
  docId: string;
  action: EthicsAction;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  editCountLast10m?: number;
  deleteRestoreLoopLast1h?: number;
};

export type EthicsPolicy = {
  thresholds: {
    allow: number; // >= allow => allow
    review: number; // >= review => review_required, else block
  };
  weights: {
    transparency: number;
    accountability: number;
    fairness: number;
    humanFirst: number;
  };
};

const defaultPolicy: EthicsPolicy = {
  thresholds: { allow: 80, review: 60 },
  weights: { transparency: 25, accountability: 25, fairness: 25, humanFirst: 25 },
};

export function evaluateEthics(ctx: EthicsContext, policy: EthicsPolicy = defaultPolicy) {
  const reasons: string[] = [];
  const signals: Record<string, any> = {};

  // 기본 점수 (100점 만점)
  let transparency = 50;
  let accountability = 50;
  let fairness = 50;
  let humanFirst = 50;

  // Role 기반 점수 조정
  if (ctx.role === "admin") {
    accountability += 20;
    transparency += 10;
  } else if (ctx.role === "editor") {
    accountability += 10;
  }

  // Action 기반 점수 조정
  if (ctx.action === "delete" || ctx.action === "restore") {
    accountability -= 15;
    humanFirst -= 10;
    reasons.push("삭제/복원 작업은 추가 검토 필요");
  }

  if (ctx.action === "create") {
    transparency += 5;
  }

  // Edit burst 감지
  if ((ctx.editCountLast10m ?? 0) > 5) {
    accountability -= 10;
    reasons.push("짧은 시간 내 반복 수정 감지");
  }

  // Delete-restore loop 감지
  if ((ctx.deleteRestoreLoopLast1h ?? 0) > 2) {
    accountability -= 20;
    humanFirst -= 15;
    reasons.push("삭제-복원 반복 패턴 감지");
  }

  // Weighted score 계산
  const weighted =
    (transparency * policy.weights.transparency +
      accountability * policy.weights.accountability +
      fairness * policy.weights.fairness +
      humanFirst * policy.weights.humanFirst) /
    100;

  const score = clampInt(Math.round(weighted), 0, 100);

  let verdict: EthicsVerdict = "allow";
  if (score < policy.thresholds.review) verdict = "block";
  else if (score < policy.thresholds.allow) verdict = "review_required";

  signals.transparency = transparency;
  signals.accountability = accountability;
  signals.fairness = fairness;
  signals.humanFirst = humanFirst;
  signals.role = ctx.role;
  signals.action = ctx.action;
  signals.editBurst = ctx.editCountLast10m ?? 0;
  signals.deleteRestoreLoop = ctx.deleteRestoreLoopLast1h ?? 0;

  return { score, verdict, reasons: uniq(reasons), signals };
}

/**
 * ✅ COMMIT 7: Policy 주입 가능한 버전
 * 시뮬레이션에서 사용
 */
export function evaluateEthicsWithPolicy(ctx: EthicsContext, policy: EthicsPolicy) {
  return evaluateEthics(ctx, policy);
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}
function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Auto-Guard 적용
 * 
 * 기존 점수/판단은 유지하되, Auto-Guard가 있으면 verdict를 덮어씀
 */
export function applyAutoGuard(
  verdict: EthicsVerdict,
  reasons: string[],
  guard: { forcedVerdict: "block" | "review_required" | null; reason?: string }
): { verdict: EthicsVerdict; reasons: string[] } {
  if (!guard.forcedVerdict) return { verdict, reasons };

  return {
    verdict: guard.forcedVerdict,
    reasons: [...reasons, guard.reason || "Auto-Guard 적용"],
  };
}
