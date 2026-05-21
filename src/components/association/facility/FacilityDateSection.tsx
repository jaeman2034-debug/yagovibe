/**
 * Facility 날짜 섹션 컴포넌트
 * 
 * 날짜별로 그룹화된 슬롯 표시
 */

import { FacilitySlot } from "@/types/facility";
import { FacilitySlotItem } from "./FacilitySlotItem";

interface FacilityDateSectionProps {
  date: string;
  slots: FacilitySlot[];
}

export function FacilityDateSection({ date, slots }: FacilityDateSectionProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-700">
        {formatDate(date)}
      </h3>
      <div className="space-y-2">
        {slots.map((slot) => (
          <FacilitySlotItem
            key={slot.id}
            timeStart={slot.timeStart}
            timeEnd={slot.timeEnd}
            status={slot.status}
          />
        ))}
      </div>
    </div>
  );
}

