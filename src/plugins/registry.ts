/**
 * ✅ COMMIT 18-1: Plugin Registry
 * 내장 플러그인 등록 및 실행
 */

import type { PluginHooks, PluginContext } from "./types";
import { datadogPlugin } from "./builtins/datadogPlugin";
import { getCurrentDrPolicy } from "@/lib/dr/useDrStatus";

// 플러그인 목록
export const plugins: PluginHooks[] = [
  datadogPlugin, // ✅ COMMIT 18-1: Datadog 추가
  // TODO: sentryPlugin, ethicsLogPlugin, approvalPlugin, anomalyPlugin 추가
];

/**
 * ✅ COMMIT 19: DR 체크 (region_down 시 플러그인 차단)
 */
async function checkDrPolicy(ctx: PluginContext): Promise<boolean> {
  try {
    const policy = await getCurrentDrPolicy(ctx.tenantId);
    if (policy?.mode === "region_down") {
      return false; // 플러그인 차단
    }
    return true;
  } catch {
    return true; // 오류 시 통과
  }
}

/**
 * 활성화된 플러그인만 필터링
 * ✅ COMMIT 24: Plugin paused 체크 (Auto-Remediation)
 */
async function getEnabledPlugins(ctx: PluginContext): Promise<PluginHooks[]> {
  // ✅ COMMIT 21: Chaos 주입 (DR 체크 전에)
  const chaos = await getChaosPolicy(ctx.tenantId);
  maybeChaos(chaos, "plugin_fail");

  // ✅ COMMIT 19: DR 체크
  const drAllowed = await checkDrPolicy(ctx);
  if (!drAllowed) {
    return []; // region_down 시 플러그인 모두 차단
  }

  // ✅ COMMIT 24: Plugin paused 체크 (Auto-Remediation)
  try {
    const { doc, getDoc, deleteDoc, serverTimestamp } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const controlSnap = await getDoc(doc(db, "_pluginControls", ctx.tenantId));
    if (controlSnap.exists) {
      const control = controlSnap.data();
      const expiresAt = control?.expiresAt;
      if (control?.paused) {
        // ✅ COMMIT 24: 만료 체크
        if (expiresAt) {
          const expiresDate = expiresAt?.toDate?.() ?? new Date(expiresAt);
          if (expiresDate < new Date()) {
            // 만료됨 → 자동 복구 (비동기)
            deleteDoc(doc(db, "_pluginControls", ctx.tenantId)).catch((error) => {
              console.error("[getEnabledPlugins] 만료된 plugin control 정리 실패:", error);
            });
            // 만료되었으므로 플러그인 정상 동작
          } else {
            // 아직 만료 안 됨 → 플러그인 일시 중지
            return [];
          }
        } else {
          // expiresAt 없으면 영구 일시 중지로 간주
          return [];
        }
      }
    }
  } catch (error) {
    // 오류 시 플러그인 정상 동작
    console.warn("[getEnabledPlugins] plugin control 체크 오류:", error);
  }

  return plugins.filter((plugin) => {
    if (!plugin.enabled) return true;
    try {
      return plugin.enabled(ctx);
    } catch {
      return false;
    }
  });
}

/**
 * beforeSave 훅 실행
 */
export async function runBeforeSave(ctx: PluginContext): Promise<void> {
  const enabled = await getEnabledPlugins(ctx);
  await Promise.allSettled(
    enabled
      .filter((p) => p.beforeSave)
      .map((p) => p.beforeSave!(ctx))
  );
}

/**
 * afterSave 훅 실행
 */
export async function runAfterSave(
  ctx: PluginContext,
  saved: any
): Promise<void> {
  const enabled = await getEnabledPlugins(ctx);
  await Promise.allSettled(
    enabled
      .filter((p) => p.afterSave)
      .map((p) => p.afterSave!(ctx, saved))
  );
}

/**
 * afterEvaluateEthics 훅 실행
 */
export async function runAfterEvaluateEthics(
  ctx: PluginContext,
  decision: any
): Promise<void> {
  const enabled = await getEnabledPlugins(ctx);
  await Promise.allSettled(
    enabled
      .filter((p) => p.afterEvaluateEthics)
      .map((p) => p.afterEvaluateEthics!(ctx, decision))
  );
}

/**
 * onApprovalCreated 훅 실행
 */
export async function runOnApprovalCreated(
  ctx: PluginContext,
  approvalId: string
): Promise<void> {
  const enabled = await getEnabledPlugins(ctx);
  await Promise.allSettled(
    enabled
      .filter((p) => p.onApprovalCreated)
      .map((p) => p.onApprovalCreated!(ctx, approvalId))
  );
}

/**
 * onAnomalyDetected 훅 실행
 */
export async function runOnAnomalyDetected(
  tenantId: string,
  payload: any
): Promise<void> {
  const enabledPlugins = plugins.filter((p) => p.onAnomalyDetected);
  await Promise.allSettled(
    enabledPlugins.map((p) => p.onAnomalyDetected!(tenantId, payload))
  );
}

