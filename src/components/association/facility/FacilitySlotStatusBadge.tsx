/**
 * Facility 슬롯 상태 배지 컴포넌트 (Admin용)
 * 
 * Admin 화면에서만 사용 (Public은 FacilitySlotItem 사용)
 */

import { FacilitySlotStatus } from "@/types/facility";

const STATUS_LABEL: Record<FacilitySlotStatus, string> = {
  available: "사용 가능",
  blocked: "사용 불가",
  event: "행사 사용",
};

interface FacilitySlotStatusBadgeProps {
  status: FacilitySlotStatus;
}

export function FacilitySlotStatusBadge({ status }: FacilitySlotStatusBadgeProps) {
  const label = STATUS_LABEL[status];
  
  // Admin 화면에서는 색상 배지 사용 (관리 용이성)
  const config = {
    available: "bg-green-100 text-green-700",
    blocked: "bg-red-100 text-red-700",
    event: "bg-blue-100 text-blue-700",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config[status]}`}>
      {label}
    </span>
  );
}

