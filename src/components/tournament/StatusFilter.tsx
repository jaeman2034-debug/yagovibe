/**
 * 🔥 상태 필터 컴포넌트
 * 
 * 참가 신청 상태별 필터링
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusFilterProps {
  value: "all" | "pending" | "approved" | "rejected";
  onChange: (value: "all" | "pending" | "approved" | "rejected") => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const filters: Array<{ key: "all" | "pending" | "approved" | "rejected"; label: string }> = [
    { key: "pending", label: "⏳ 대기" },
    { key: "approved", label: "✅ 승인" },
    { key: "rejected", label: "❌ 반려" },
    { key: "all", label: "전체" },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {filters.map((filter) => (
        <Button
          key={filter.key}
          variant={value === filter.key ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(filter.key)}
          className={cn(
            value === filter.key && "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
