/**
 * ✅ COMMIT 28: Benchmark 카드 컴포넌트
 */

import React from "react";

export function BenchmarkCard({
  title,
  value,
  percentile,
}: {
  title: string;
  value: string;
  percentile: number | null;
}) {
  const getPercentileLabel = (p: number | null): string => {
    if (p === null) return "데이터 부족";
    if (p >= 90) return `상위 ${100 - p}% (우수)`;
    if (p >= 75) return `상위 ${100 - p}% (양호)`;
    if (p >= 50) return `중위 ${p}% (평균)`;
    if (p >= 25) return `하위 ${p}% (개선 필요)`;
    return `하위 ${p}% (우선 개선)`;
  };

  const getPercentileColor = (p: number | null): string => {
    if (p === null) return "#666";
    if (p >= 90) return "#22c55e"; // green
    if (p >= 75) return "#3b82f6"; // blue
    if (p >= 50) return "#f59e0b"; // amber
    if (p >= 25) return "#ef4444"; // red
    return "#dc2626"; // dark red
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 12,
        borderRadius: 8,
        background: "#fff",
        minWidth: 200,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{value}</div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.8,
          color: getPercentileColor(percentile),
          fontWeight: 500,
        }}
      >
        {getPercentileLabel(percentile)}
      </div>
    </div>
  );
}

