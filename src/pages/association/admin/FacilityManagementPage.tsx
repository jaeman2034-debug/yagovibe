/**
 * 대관 관리 페이지 (Admin 전용)
 * /association/:associationId/admin/facility
 * 
 * 원칙:
 * - 토글 중심 UX
 * - 드래그 ❌
 * - 복잡한 캘린더 ❌
 * - 토글 + 저장만
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";
import { FacilitySlot, FacilitySlotStatus } from "@/types/facility";
import { FacilitySlotStatusBadge } from "@/components/association/facility/FacilitySlotStatusBadge";

export default function FacilityManagementPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [slots, setSlots] = useState<FacilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("10:00");
  const [status, setStatus] = useState<FacilitySlotStatus>("available");
  const [saving, setSaving] = useState(false);

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, navigate]);

  // 대관 정보 조회
  useEffect(() => {
    if (!associationId || !isAdmin) return;

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
  }, [associationId, isAdmin]);

  // 충돌 체크
  const checkConflict = (date: string, timeStart: string, timeEnd: string): boolean => {
    return slots.some((slot) => {
      if (slot.date !== date) return false;
      // 시간 겹침 체크
      return (
        (timeStart >= slot.timeStart && timeStart < slot.timeEnd) ||
        (timeEnd > slot.timeStart && timeEnd <= slot.timeEnd) ||
        (timeStart <= slot.timeStart && timeEnd >= slot.timeEnd)
      );
    });
  };

  // 슬롯 추가
  const handleAddSlot = async () => {
    if (!associationId || !user) return;

    // 충돌 체크
    if (checkConflict(selectedDate, timeStart, timeEnd)) {
      alert("해당 시간대에 이미 등록된 대관 상태가 있습니다.");
      return;
    }

    try {
      setSaving(true);
      const slotsRef = collection(db, `associations/${associationId}/facility_slots`);
      const newSlotRef = await addDoc(slotsRef, {
        associationId,
        date: selectedDate,
        timeStart,
        timeEnd,
        status,
        updatedAt: serverTimestamp(),
      });

      // 로그 기록
      try {
        await addDoc(collection(db, `associations/${associationId}/audit_logs`), {
          action: "FACILITY_SLOT_CREATED",
          slotId: newSlotRef.id,
          adminId: user.uid,
          date: selectedDate,
          timeStart,
          timeEnd,
          status,
          timestamp: serverTimestamp(),
        });
      } catch (logError) {
        console.error("로그 기록 실패:", logError);
      }

      // 목록 새로고침
      const q = query(slotsRef, orderBy("date", "asc"), orderBy("timeStart", "asc"));
      const snapshot = await getDocs(q);
      const slotsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FacilitySlot[];
      setSlots(slotsData);

      // 입력 초기화
      setTimeStart("09:00");
      setTimeEnd("10:00");
      setStatus("available");
    } catch (error) {
      console.error("대관 정보 추가 오류:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 슬롯 삭제
  const handleDeleteSlot = async (slotId: string) => {
    if (!associationId) return;
    if (!confirm("이 대관 정보를 삭제하시겠습니까?")) return;

    try {
      const slotRef = doc(db, `associations/${associationId}/facility_slots/${slotId}`);
      await deleteDoc(slotRef);

      // 목록 새로고침
      const slotsRef = collection(db, `associations/${associationId}/facility_slots`);
      const q = query(slotsRef, orderBy("date", "asc"), orderBy("timeStart", "asc"));
      const snapshot = await getDocs(q);
      const slotsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FacilitySlot[];
      setSlots(slotsData);
    } catch (error) {
      console.error("대관 정보 삭제 오류:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const selectedDateSlots = slots.filter((slot) => slot.date === selectedDate);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/association/${associationId}`)}
            className="text-blue-600 hover:text-blue-800 mb-4 text-sm"
          >
            ← 협회 페이지로 돌아가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">대관 관리</h1>
        </div>

        {/* 입력 폼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">대관 정보 추가</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                날짜
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시작 시간
                </label>
                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종료 시간
                </label>
                <input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FacilitySlotStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="available">사용 가능</option>
                <option value="blocked">사용 불가</option>
                <option value="event">행사 사용</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddSlot}
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "저장 중..." : "추가"}
              </button>
            </div>
          </div>
        </div>

        {/* 대관 정보 리스트 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("ko-KR")} 대관 현황
          </h2>
          {selectedDateSlots.length === 0 ? (
            <p className="text-gray-500 text-center py-8">등록된 대관 정보가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {selectedDateSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {slot.timeStart} ~ {slot.timeEnd}
                    </span>
                    <FacilitySlotStatusBadge status={slot.status} />
                  </div>
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

