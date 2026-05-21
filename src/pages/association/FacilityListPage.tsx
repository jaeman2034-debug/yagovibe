/**
 * 대관 현황 페이지 (Public 읽기 전용)
 * /association/:associationId/facility
 * 
 * 원칙:
 * - Public은 status만 본다 (사유·연락처 ❌)
 * - 전화/카톡 차단 장치
 */

import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FacilitySlot } from "@/types/facility";
import { FacilityEmptyState } from "@/components/association/facility/FacilityEmptyState";
import { FacilityDateSection } from "@/components/association/facility/FacilityDateSection";
import { SectionLayout } from "@/components/association/SectionLayout";

export default function FacilityListPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const [slots, setSlots] = useState<FacilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId) return;

    const fetchSlots = async () => {
      try {
        const slotsRef = collection(db, `associations/${associationId}/facility_slots`);
        const q = query(slotsRef, orderBy("date", "asc"), orderBy("timeStart", "asc"));
        const snapshot = await getDocs(q);

        const slotsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FacilitySlot[];

        setSlots(slotsData);
      } catch (error) {
        console.error("대관 정보 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [associationId]);

  if (loading) {
    return (
      <SectionLayout title="대관 현황" associationId={associationId}>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </SectionLayout>
    );
  }

  // 날짜별로 그룹화
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, FacilitySlot[]>);

  const availableDates = Object.keys(slotsByDate).sort();

  return (
    <SectionLayout
      title="대관 현황"
      associationId={associationId}
      description="본 대관 현황은 협회 공식 기준입니다. 개별 문의 및 예외 적용은 하지 않습니다."
    >
      {/* 대관 정보 */}
      {slots.length === 0 ? (
        <FacilityEmptyState />
      ) : (
        <div className="space-y-6">
          {availableDates.map((date) => (
            <FacilityDateSection
              key={date}
              date={date}
              slots={slotsByDate[date]}
            />
          ))}
        </div>
      )}
    </SectionLayout>
  );
}
