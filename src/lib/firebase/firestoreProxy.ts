/**
 * ✅ COMMIT 19: Firestore Proxy with DR 주입
 * ✅ COMMIT 21: Chaos Engineering 주입
 * 읽기/쓰기/승인 공통 DR 체크
 */

import { assertDrAllowed } from "@/lib/dr/drSimulator";
import { getCurrentDrPolicy } from "@/lib/dr/useDrStatus";
import { getChaosPolicy, maybeChaos } from "@/lib/chaos/chaosInjector";

export async function drWrite(ctx: {
  tenantId: string;
  region?: string;
}): Promise<void> {
  // ✅ COMMIT 21: Chaos 주입 (DR 체크 전에)
  const chaos = await getChaosPolicy(ctx.tenantId);
  maybeChaos(chaos, "firestore_write_fail");

  const policy = await getCurrentDrPolicy(ctx.tenantId);
  assertDrAllowed({ policy, action: "write", region: ctx.region });
}

export async function drRead(ctx: {
  tenantId: string;
  region?: string;
}): Promise<void> {
  // ✅ COMMIT 21: Chaos 주입
  const chaos = await getChaosPolicy(ctx.tenantId);
  maybeChaos(chaos, "firestore_read_fail");

  const policy = await getCurrentDrPolicy(ctx.tenantId);
  assertDrAllowed({ policy, action: "read", region: ctx.region });
}

export async function drApprove(ctx: {
  tenantId: string;
  region?: string;
}): Promise<void> {
  const policy = await getCurrentDrPolicy(ctx.tenantId);
  assertDrAllowed({ policy, action: "approve", region: ctx.region });
}

