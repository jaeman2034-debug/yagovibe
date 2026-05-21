/**
 * ✅ COMMIT 19: DR 시뮬레이터 (중앙 게이트)
 * 장애 모드에 따라 읽기/쓰기/승인 차단
 */

import type { DrPolicy } from "./drPolicy";

export function assertDrAllowed(input: {
  policy: DrPolicy | null;
  action: "read" | "write" | "approve";
  region?: string;
}): void {
  const { policy, action, region } = input;

  if (!policy || policy.mode === "normal") return;

  if (policy.mode === "read_only" && action === "write") {
    throw new Error(`DR: read-only mode (write blocked)${policy.message ? ` - ${policy.message}` : ""}`);
  }

  if (policy.mode === "write_blocked" && action !== "read") {
    throw new Error(`DR: write/approve blocked${policy.message ? ` - ${policy.message}` : ""}`);
  }

  if (
    policy.mode === "region_down" &&
    region &&
    policy.affectedRegions?.includes(region)
  ) {
    throw new Error(`DR: region ${region} is down${policy.message ? ` - ${policy.message}` : ""}`);
  }
}

