/** Sprint C-1 — Parent-facing copy (Step5 · PDF shared) */

import type { DimensionComparisonRow } from "@/lib/ai-growth/growthSessionComparison";

export const PARENT_GROWTH_FIRST_RECORD_TITLE = "첫 성장 기록입니다.";

export const PARENT_GROWTH_FIRST_RECORD_BODY =
  "이번 훈련이 기준점으로 저장되었습니다.\n다음 훈련부터 성장 변화를 확인할 수 있습니다.";

export const PARENT_GROWTH_COMPARISON_FOOTNOTE = "최근 2회 훈련 비교 기준";

export const PARENT_GROWTH_DECLINE_SUPPORT = "다음 훈련에서 회복할 수 있습니다.";

export function formatParentDeltaBadge(delta: number): { label: string; tone: "up" | "flat" | "down" } {
  if (delta > 0) {
    return { label: `+${delta} 성장 ↑`, tone: "up" };
  }
  if (delta < 0) {
    return { label: `${delta} 변화 ↓`, tone: "down" };
  }
  return { label: "변화 없음", tone: "flat" };
}

/** 학부모 Hero · PDF — 축별 delta 풀 라벨 (Pilot C-1.2) */
export const PARENT_DIMENSION_TITLE: Record<
  DimensionComparisonRow["key"],
  string
> = {
  SCAN: "시야",
  PRESS_RESIST: "압박 대응",
  QUICK_RECOVERY: "빠른 재집중",
};

export type ParentDimensionDeltaDisplay = {
  title: string;
  deltaLine: string;
  explanation: string | null;
};

function buildParentDimensionDeltaExplanation(row: DimensionComparisonRow): string | null {
  if (row.delta === null || row.delta === 0) return null;
  if (row.key === "QUICK_RECOVERY") {
    return row.delta < 0
      ? "실수 후 다시 집중하는 빈도가 지난 훈련보다 감소했습니다."
      : "실수 후 빠르게 다시 집중하는 모습이 늘었습니다.";
  }
  if (row.key === "SCAN") {
    return row.delta > 0
      ? "주변 상황을 살피는 시야 사용이 지난 훈련보다 늘었습니다."
      : "시야 스캔 빈도가 지난 훈련보다 줄었습니다.";
  }
  if (row.key === "PRESS_RESIST") {
    return row.delta > 0
      ? "압박 상황에서 침착하게 대응하는 장면이 늘었습니다."
      : "압박 대응 장면이 지난 훈련보다 줄었습니다.";
  }
  return null;
}

/** Pilot C-1.2 — 숫자만이 아닌 의미 설명 (Step5 · PDF 공유) */
export function buildParentDimensionDeltaDisplay(
  row: DimensionComparisonRow
): ParentDimensionDeltaDisplay | null {
  if (row.delta === null || row.current === null) return null;
  const sign = row.delta > 0 ? "+" : "";
  return {
    title: PARENT_DIMENSION_TITLE[row.key],
    deltaLine: `지난 훈련 대비 ${sign}${row.delta}`,
    explanation: buildParentDimensionDeltaExplanation(row),
  };
}
