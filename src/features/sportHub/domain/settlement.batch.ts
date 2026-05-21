/**
 * 🔥 Settlement Batch - 정산 배치 처리
 * 
 * 주 1회 배치 (매주 월요일 04:00)
 */

import type { Settlement, SettlementItem, SettlementTarget } from "./settlement.types";
import { canSettle, calculateFee } from "./settlement.rules";
import { getSettlementPeriod } from "./settlement.rules";

/**
 * 정산 가능 항목 조회 (서버 API)
 */
export async function getReadySettlementItems(
  ownerId?: string
): Promise<SettlementItem[]> {
  // 실제 구현: GET /api/settlement/items?ownerId=xxx&status=READY
  const API_BASE = import.meta.env.VITE_API_BASE || "/api";
  const query = new URLSearchParams();
  query.set("status", "READY");
  if (ownerId) query.set("ownerId", ownerId);

  try {
    const res = await fetch(`${API_BASE}/settlement/items?${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`정산 항목 조회 실패: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error("[SettlementBatch] 항목 조회 오류:", error);
    return [];
  }
}

/**
 * 정산 생성 (서버 API)
 */
export async function createSettlement(
  settlement: Omit<Settlement, "id" | "createdAt">
): Promise<Settlement> {
  const API_BASE = import.meta.env.VITE_API_BASE || "/api";

  const res = await fetch(`${API_BASE}/settlement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settlement),
  });

  if (!res.ok) {
    throw new Error(`정산 생성 실패: ${res.status}`);
  }

  return res.json();
}

/**
 * 정산 배치 실행
 */
export async function runSettlementBatch(): Promise<{
  success: boolean;
  settlementsCreated: number;
  error?: string;
}> {
  try {
    // 1. 정산 가능 항목 조회
    const items = await getReadySettlementItems();

    // 2. 확정 조건 확인
    const readyItems = items.filter((item) => {
      const check = canSettle(item);
      return check.canSettle;
    });

    if (readyItems.length === 0) {
      return {
        success: true,
        settlementsCreated: 0,
      };
    }

    // 3. 사업자별 그룹화
    const groups = new Map<string, SettlementItem[]>();
    for (const item of readyItems) {
      // ownerId는 reservation에서 가져와야 함 (실제 구현 시)
      const ownerId = "unknown"; // TODO: 실제 ownerId 조회
      if (!groups.has(ownerId)) {
        groups.set(ownerId, []);
      }
      groups.get(ownerId)!.push(item);
    }

    // 4. 정산 주기 계산
    const period = getSettlementPeriod();

    // 5. 사업자별 정산 생성
    let created = 0;
    for (const [ownerId, ownerItems] of groups) {
      const total = ownerItems.reduce((sum, item) => sum + item.net, 0);
      const feeTotal = ownerItems.reduce((sum, item) => sum + item.fee, 0);

      const settlement: Omit<Settlement, "id" | "createdAt"> = {
        ownerId,
        period: period.week,
        startDate: period.startDate,
        endDate: period.endDate,
        total,
        feeTotal,
        items: ownerItems,
        status: "PENDING",
      };

      await createSettlement(settlement);
      created++;
    }

    return {
      success: true,
      settlementsCreated: created,
    };
  } catch (error) {
    return {
      success: false,
      settlementsCreated: 0,
      error: error instanceof Error ? error.message : "정산 배치 실패",
    };
  }
}
