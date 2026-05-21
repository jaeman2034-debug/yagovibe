/**
 * FacilitySection
 * Phase 4-1: 대관 완전 자동화
 * 
 * 슬롯 상태: available | blocked | event
 * 관리자 Edit Mode: available ↔ blocked 토글 (hover-only ✏️, confirm 필수)
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "@/context/AuthProvider";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { Pencil } from "lucide-react";

export type FacilitySlotStatus = "available" | "blocked" | "event";

interface FacilitySlot {
  id: string;
  date: string;
  timeRange: string;
  status: FacilitySlotStatus;
  eventTitle?: string;
  updatedAt?: any;
  updatedBy?: string;
}

interface FacilitySectionProps {
  associationId: string;
  isEditMode: boolean;
}

export function FacilitySection({ associationId, isEditMode }: FacilitySectionProps) {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const [slots, setSlots] = useState<FacilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingSlotId, setTogglingSlotId] = useState<string | null>(null);

  // 시설 ID (지시문에서는 facilityId가 필요한데, 일단 첫 번째 시설을 가정)
  // 실제로는 associations/{associationId}/facilities에서 조회해야 함
  const facilityId = "facility-1"; // TODO: 실제 시설 ID 조회 필요

  useEffect(() => {
    if (!facilityId) return;

    const loadSlots = async () => {
      try {
        const slotsRef = collection(db, `facilities/${facilityId}/slots`);
        const q = query(slotsRef, where("date", ">=", new Date().toISOString().split("T")[0]));
        const snapshot = await getDocs(q);
        
        const slotsData: FacilitySlot[] = [];
        snapshot.forEach((doc) => {
          slotsData.push({
            id: doc.id,
            ...doc.data(),
          } as FacilitySlot);
        });

        // 날짜 순 정렬
        slotsData.sort((a, b) => a.date.localeCompare(b.date));
        setSlots(slotsData);
      } catch (error) {
        console.error("슬롯 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [facilityId]);

  const handleToggleSlot = async (slot: FacilitySlot) => {
    if (slot.status === "event") return; // event는 토글 불가
    if (!isAdmin || !isEditMode) return;

    const newStatus: FacilitySlotStatus = slot.status === "available" ? "blocked" : "available";
    const confirmMessage = `이 슬롯을 "${newStatus === "available" ? "사용 가능" : "협회 사용"}"으로 변경하시겠습니까?`;

    if (!window.confirm(confirmMessage)) return;

    setTogglingSlotId(slot.id);

    try {
      const updateFacilitySlotFn = httpsCallable<
        { facilityId: string; slotId: string; status: FacilitySlotStatus },
        { success: boolean; message: string }
      >(functions, "updateFacilitySlot");

      const result = await updateFacilitySlotFn({
        facilityId,
        slotId: slot.id,
        status: newStatus,
      });

      if (result.data.success) {
        // 로컬 상태 업데이트
        setSlots((prev) =>
          prev.map((s) => (s.id === slot.id ? { ...s, status: newStatus } : s))
        );
      } else {
        throw new Error(result.data.message || "슬롯 상태 변경에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("슬롯 상태 변경 오류:", error);
      alert(error.message || "슬롯 상태 변경에 실패했습니다.");
    } finally {
      setTogglingSlotId(null);
    }
  };

  if (loading || adminLoading) {
    return (
      <section id="facilities" className="py-12 border-b">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-2xl font-bold mb-4">대관 안내</h2>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </section>
    );
  }

  const getStatusColor = (status: FacilitySlotStatus) => {
    switch (status) {
      case "available":
        return "bg-green-50 border-green-200 text-green-800";
      case "blocked":
        return "bg-red-50 border-red-200 text-red-800";
      case "event":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getStatusLabel = (status: FacilitySlotStatus) => {
    switch (status) {
      case "available":
        return "사용 가능";
      case "blocked":
        return "협회 사용";
      case "event":
        return "대회/행사";
      default:
        return status;
    }
  };

  return (
    <section id="facilities" className="py-12 border-b">
      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className="text-2xl font-bold mb-4">대관 안내</h2>
        
        {slots.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-600 font-medium mb-2">등록된 슬롯이 없습니다</p>
            <p className="text-sm text-gray-500 mb-4">대회를 생성하면 경기장 슬롯이 자동으로 생성됩니다</p>
            {isAdmin && (
              <button
                onClick={() => {
                  // TODO: 시설 관리 페이지로 이동 또는 슬롯 생성 모달 열기
                  alert("시설 관리 페이지로 이동합니다.");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                시설 관리하기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map((slot) => {
              const canEdit = isAdmin && isEditMode && slot.status !== "event";
              const isToggling = togglingSlotId === slot.id;

              return (
                <div
                  key={slot.id}
                  className={`group relative p-4 border-2 rounded-lg ${getStatusColor(slot.status)} ${
                    canEdit ? "cursor-pointer hover:shadow-md transition-shadow" : ""
                  } ${isToggling ? "opacity-50" : ""}`}
                  onClick={() => canEdit && handleToggleSlot(slot)}
                >
                  {/* hover-only Edit Icon (관리자만) */}
                  {canEdit && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-white rounded-full p-1 shadow-sm">
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                  )}

                  <div className="font-medium">{slot.date}</div>
                  <div className="text-sm mt-1">{slot.timeRange}</div>
                  <div className="text-sm font-semibold mt-2">
                    {getStatusLabel(slot.status)}
                  </div>
                  {slot.eventTitle && (
                    <div className="text-xs mt-1 text-gray-600">{slot.eventTitle}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

