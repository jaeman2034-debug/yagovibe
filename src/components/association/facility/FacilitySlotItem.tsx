/**
 * Facility 슬롯 아이템 컴포넌트 (Public 읽기 전용)
 * 
 * 원칙:
 * - 읽기만 가능 (클릭/호버 액션 ❌)
 * - 색상으로 의미 전달하지 않음 (텍스트 중심)
 * - 상태 → 문구 매핑 고정
 */

import { FacilitySlotStatus } from "@/types/facility";

interface FacilitySlotItemProps {
  timeStart: string;
  timeEnd: string;
  status: FacilitySlotStatus;
}

const STATUS_LABEL: Record<FacilitySlotStatus, string> = {
  available: "사용 가능",
  blocked: "사용 불가",
  event: "행사 사용",
};

export function FacilitySlotItem({ timeStart, timeEnd, status }: FacilitySlotItemProps) {
  const statusLabel = STATUS_LABEL[status];

  // 스타일: 색상이 아닌 텍스트 스타일로 구분
  const getStatusStyle = () => {
    switch (status) {
      case "available":
        return "text-gray-900"; // 기본 텍스트
      case "blocked":
        return "text-gray-500"; // 흐린 텍스트
      case "event":
        return "text-gray-900 font-semibold"; // 굵은 텍스트
      default:
        return "text-gray-900";
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-white border border-gray-200 rounded">
      <div className="text-sm font-medium text-gray-900">
        {timeStart} - {timeEnd}
      </div>
      <div className={`text-sm ${getStatusStyle()}`}>
        {statusLabel}
      </div>
    </div>
  );
}

